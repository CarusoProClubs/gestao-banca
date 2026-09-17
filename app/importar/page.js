"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { salvarBilhete } from "../../lib/tickets";

function money(value) {
  if (value == null) return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ImportarPage() {
  const [msg, setMsg] = useState("");
  const [job, setJob] = useState(null);
  const [bilhete, setBilhete] = useState(null);

  useEffect(() => {
    if (!job || job.status !== "lendo") return;
    const supabase = getSupabase();
    const timer = setInterval(async () => {
      const { data } = await supabase.from("ticket_jobs").select("*").eq("id", job.id).single();
      if (!data) return;
      setJob(data);
      if (data.status === "pronto" && data.payload) setBilhete(data.payload);
      if (data.status === "erro") setMsg(data.error || "Falha na leitura");
    }, 2000);
    return () => clearInterval(timer);
  }, [job]);

  async function enviarPrint(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) return setMsg("Entre em /login primeiro");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", sessionData.user.id)
      .single();
    if (profileError || !profile) return setMsg("Perfil não encontrado");

    setMsg("Enviando print...");
    setBilhete(null);
    const path = `${profile.organization_id}/${Date.now()}-${file.name}`;
    const { error: upError } = await supabase.storage.from("prints").upload(path, file, {
      contentType: file.type || "image/png",
      upsert: false,
    });
    if (upError) return setMsg(upError.message);

    const { data: created, error } = await supabase
      .from("ticket_jobs")
      .insert({
        organization_id: profile.organization_id,
        created_by: sessionData.user.id,
        status: "lendo",
        image_path: path,
      })
      .select("*")
      .single();
    if (error) return setMsg(error.message);
    setJob(created);
    setMsg("Print com o leitor. Conferindo o bilhete...");
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
    setJob(null);
  }

  return (
    <section className="card">
      <h2>Enviar print</h2>
      <p>Sobe o print do bilhete. O leitor devolve os dados aqui. Você só confirma ou edita.</p>
      <p>
        <input type="file" accept="image/*" onChange={enviarPrint} />
      </p>
      {job?.status === "lendo" && <p>Lendo o print...</p>}
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
          <p>Pernas:</p>
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
