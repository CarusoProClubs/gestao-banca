"use client";

import { useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { salvarBilhete } from "../../lib/tickets";
import { fecharBilhete } from "../../lib/resultado";
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
    setMsg(files.length ? `${files.length} ${files.length === 1 ? "imagem selecionada" : "imagens selecionadas"}. Todas serão tratadas como um único bilhete.` : "");
  }

  async function lerBilhete() {
    if (!arquivos.length) return setMsg("Selecione pelo menos uma imagem.");
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session?.access_token) return setMsg("Entre em /login primeiro");

    setLendo(true);
    setMsg("Analisando o bilhete com visão multimodal... Não é OCR simples.");
    setBilhete(null);

    try {
      const form = new FormData();
      arquivos.forEach((file) => form.append("files", file, file.name));
      const response = await fetch("/api/ler-bilhete", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao interpretar o bilhete.");

      const fechado = fecharBilhete(data.bilhete);
      setBilhete(fechado);
      setMsg(fechado.documento_valido
        ? "Leitura concluída. Confira principalmente jogos, times, seleções e valores antes de salvar."
        : "Não consegui confirmar que as imagens são um comprovante válido. Confira os avisos antes de continuar.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Falha ao ler o bilhete.");
    } finally {
      setLendo(false);
    }
  }

  async function confirmar() {
    if (!bilhete?.casa) return setMsg("Selecione a casa de aposta antes de confirmar.");
    if (!bilhete?.valor_apostado) return setMsg("Informe o valor apostado antes de confirmar.");

    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) return setMsg("Sua sessão expirou. Entre novamente em /login.");
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", sessionData.user.id)
      .single();
    if (!profile?.organization_id) return setMsg("Perfil sem organização vinculada.");

    const result = await salvarBilhete(supabase, profile, sessionData.user.id, bilhete);
    if (result.error) return setMsg(result.error.message);
    setMsg("Bilhete confirmado. Veja no Painel.");
    setBilhete(null);
    setArquivos([]);
  }

  return (
    <section className="card">
      <h2>Enviar bilhete</h2>
      <p>Envie um ou vários prints. Todos os arquivos selecionados serão analisados juntos como um único bilhete.</p>
      <p><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={selecionarArquivos} disabled={lendo} /></p>
      {arquivos.length > 0 && <p className="muted">{arquivos.map((file) => file.name).join(" · ")}</p>}
      <p>
        <button className="green" onClick={lerBilhete} disabled={lendo || !arquivos.length}>
          {lendo ? "Analisando..." : "🔎 Analisar bilhete"}
        </button>
      </p>
      {lendo && <p>Analisando visualmente a aposta e relacionando os dados dos prints...</p>}
      {bilhete && <BilheteCard bilhete={bilhete} onChange={setBilhete} onConfirm={confirmar} confirmarLabel="Confirmar bilhete" />}
      <p>{msg}</p>
    </section>
  );
}
