"use client";

import { useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { parseOcrText } from "../../lib/parse-ocr";
import { salvarBilhete } from "../../lib/tickets";

function money(value) {
  if (value == null) return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ImportarPage() {
  const [msg, setMsg] = useState("");
  const [lendo, setLendo] = useState(false);
  const [bilhete, setBilhete] = useState(null);

  async function enviarPrint(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) return setMsg("Entre em /login primeiro");
    setLendo(true);
    setMsg("Lendo o print...");
    setBilhete(null);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const result = await Tesseract.recognize(file, "eng");
      const parsed = parseOcrText(result.data.text || "");
      setBilhete(parsed);
      setMsg("Confira os dados. Se estiver certo, confirme.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Falha ao ler o print");
    } finally {
      setLendo(false);
    }
  }

  async function confirmar() {
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", sessionData.user.id)
      .single();
    const result = await salvarBilhete(supabase, profile, sessionData.user.id, bilhete);
    if (result.error) return setMsg(result.error.message);
    setMsg("Bilhete confirmado. Veja em Bilhetes.");
    setBilhete(null);
  }

  return (
    <section className="card">
      <h2>Enviar print</h2>
      <p>Escolha a foto do bilhete. A leitura acontece aqui no site. Você só confirma.</p>
      <p>
        <input type="file" accept="image/*" onChange={enviarPrint} disabled={lendo} />
      </p>
      {lendo && <p>Lendo o print... pode levar alguns segundos.</p>}
      {bilhete && (
        <div>
          <p>
            <strong>
              {bilhete.casa} · {bilhete.tipo} · {bilhete.formato}
            </strong>
          </p>
          <p>ID: {bilhete.id_casa ?? "—"}</p>
          <p>Título: {bilhete.titulo ?? "—"}</p>
          <p>Valor: {money(bilhete.valor_apostado)}</p>
          <p>Odd: {bilhete.odd_bilhete ?? "—"}</p>
          <p>Ganhos no print: {money(bilhete.retorno_casa)}</p>
          <p>Status no print: {bilhete.status_print}</p>
          <ul>
            {(bilhete.pernas || []).map((perna) => (
              <li key={perna.ordem}>
                {perna.selecao} · {perna.mercado} {perna.odd_perna ?? ""}
              </li>
            ))}
          </ul>
          <p>
            <button className="green" onClick={confirmar}>
              Confirmar
            </button>
          </p>
        </div>
      )}
      <p>{msg}</p>
    </section>
  );
}
