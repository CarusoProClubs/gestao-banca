"use client";

import { useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { parseOcrText } from "../../lib/parse-ocr";
import { salvarBilhete } from "../../lib/tickets";
import { fecharBilhete } from "../../lib/resultado";
import BilheteCard from "../../components/BilheteCard";

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
      setBilhete(fecharBilhete(parseOcrText(result.data.text || "")));
      setMsg("Marque cada palpite e confirme o bilhete.");
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
    setMsg("Bilhete confirmado. Veja no Painel.");
    setBilhete(null);
  }

  return (
    <section className="card">
      <h2>Enviar print</h2>
      <p>Sobe a foto. O card mostra os palpites. Em múltipla, um red perde o bilhete inteiro.</p>
      <p>
        <input type="file" accept="image/*" onChange={enviarPrint} disabled={lendo} />
      </p>
      {lendo && <p>Lendo o print... pode levar alguns segundos.</p>}
      {bilhete && (
        <BilheteCard
          bilhete={bilhete}
          onChange={setBilhete}
          onConfirm={confirmar}
          confirmarLabel="Confirmar bilhete"
        />
      )}
      <p>{msg}</p>
    </section>
  );
}
