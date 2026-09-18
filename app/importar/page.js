"use client";

import { useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { salvarBilhete } from "../../lib/tickets";
import { fecharBilhete } from "../../lib/resultado";
import { validarFinanceiro } from "../../lib/types";
import BilheteCard from "../../components/BilheteCard";

export default function ImportarPage() {
  const [msg, setMsg] = useState("");
  const [lendo, setLendo] = useState(false);
  const [arquivos, setArquivos] = useState([]);
  const [bilhete, setBilhete] = useState(null);

  function selecionarArquivos(event) {
    const files = Array.from(event.target.files || []);
    setArquivos(files);
    setBilhete(null);
    setMsg(files.length ? files.length + (files.length === 1 ? " imagem selecionada." : " imagens selecionadas.") + " Todas serão tratadas como um único bilhete." : "");
  }

  async function lerBilhete() {
    if (!arquivos.length) return setMsg("Selecione pelo menos uma imagem.");
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session?.access_token) return setMsg("Entre em /login primeiro");

    setLendo(true);
    setMsg("Analisando visualmente o bilhete...");
    setBilhete(null);

    try {
      const form = new FormData();
      arquivos.forEach((file) => form.append("files", file, file.name));
      const response = await fetch("/api/ler-bilhete", {
        method: "POST",
        headers: { Authorization: "Bearer " + session.access_token },
        body: form
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao interpretar o bilhete.");

      const fechado = fecharBilhete(data.bilhete);
      setBilhete(fechado);
      setMsg(fechado.leitura_aprovada
        ? "Leitura concluída. Confira jogos, seleções, odds, valores e data antes de salvar."
        : "Encontrei pontos que precisam de conferência. Corrija-os abaixo antes de salvar.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Falha ao ler o bilhete.");
    } finally {
      setLendo(false);
    }
  }

  async function confirmar() {
    const revisado = fecharBilhete(bilhete);
    const errosFinanceiros = validarFinanceiro(revisado);
    if (!revisado?.casa) return setMsg("Selecione a casa de aposta antes de confirmar.");
    if (errosFinanceiros.length) return setMsg(errosFinanceiros[0]);
    if (revisado?.data_hora && Number.isNaN(new Date(revisado.data_hora).getTime())) {
      return setMsg("A data/hora está inválida. Corrija antes de confirmar.");
    }

    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) return setMsg("Sua sessão expirou. Entre novamente em /login.");

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", sessionData.user.id)
      .single();

    if (!profile?.organization_id) return setMsg("Perfil sem organização vinculada.");

    const result = await salvarBilhete(supabase, profile, sessionData.user.id, revisado);
    if (result.error) return setMsg(result.error.message);

    setMsg("Bilhete confirmado. Veja no Painel.");
    setBilhete(null);
    setArquivos([]);
  }

  return (
    <section className="card">
      <h2>Novo bilhete</h2>
      <p>Envie um ou vários prints. Eles serão analisados juntos como um único bilhete.</p>
      <p><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={selecionarArquivos} disabled={lendo} capture="environment" /></p>
      {arquivos.length > 0 && <p className="muted">{arquivos.map((file) => file.name).join(" · ")}</p>}
      <p>
        <button className="green" onClick={lerBilhete} disabled={lendo || !arquivos.length}>
          {lendo ? "Analisando..." : "🔎 Analisar bilhete"}
        </button>
      </p>
      {lendo && <p aria-live="polite">Visão multimodal ativa. A etapa de resultado esportivo não bloqueia esta leitura.</p>}
      {bilhete && <BilheteCard bilhete={bilhete} onChange={setBilhete} onConfirm={confirmar} confirmarLabel="Confirmar bilhete" />}
      <p aria-live="polite">{msg}</p>
    </section>
  );
}
