"use client";

import { useState } from "react";
import { getSupabase } from "../../lib/supabase";

export default function ImportarPage() {
  const [raw, setRaw] = useState("");
  const [msg, setMsg] = useState("");

  async function lancar() {
    const supabase = getSupabase();
    if (!supabase) return setMsg("Supabase não configurado");
    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      setMsg("JSON inválido");
      return;
    }
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) {
      setMsg("Entre em /login primeiro");
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", sessionData.user.id)
      .single();
    if (profileError || !profile) {
      setMsg("Perfil não encontrado. Crie a conta de novo depois do SQL do trigger.");
      return;
    }
    const ticket = {
      organization_id: profile.organization_id,
      created_by: sessionData.user.id,
      casa: json.casa ?? null,
      id_casa: json.id_casa ?? null,
      codigo_booking: json.codigo_booking ?? null,
      data_hora: json.data_hora ?? null,
      tipo: json.tipo ?? null,
      formato: json.formato ?? null,
      titulo: json.titulo ?? null,
      valor_apostado: json.valor_apostado ?? null,
      moeda: json.moeda ?? "BRL",
      odd_bilhete: json.odd_bilhete ?? null,
      retorno_casa: json.retorno_casa ?? null,
      status_print: json.status_print ?? "pendente",
      status_usuario: "pendente",
      esporte: json.esporte ?? null,
      jogo: json.jogo ?? null,
      payload: json,
    };
    const { data: saved, error } = await supabase.from("tickets").insert(ticket).select("id").single();
    if (error) {
      setMsg(error.message);
      return;
    }
    const legs = Array.isArray(json.pernas) ? json.pernas : [];
    if (legs.length) {
      const rows = legs.map((perna, index) => ({
        organization_id: profile.organization_id,
        ticket_id: saved.id,
        ordem: perna.ordem ?? index + 1,
        jogo: perna.jogo ?? null,
        selecao: perna.selecao ?? null,
        mercado: perna.mercado ?? null,
        odd_perna: perna.odd_perna ?? null,
        placar_print: perna.placar_print ?? null,
        status_print: perna.status_print ?? "desconhecido",
      }));
      const { error: legError } = await supabase.from("ticket_legs").insert(rows);
      if (legError) {
        setMsg("Bilhete salvo, pernas com erro: " + legError.message);
        return;
      }
    }
    setMsg("Bilhete lançado. Veja em Bilhetes.");
    setRaw("");
  }

  return (
    <section className="card">
      <h2>Importar JSON do bot</h2>
      <p>Cole o JSON que o @LeitorBilheteBot devolveu. 1 JSON = 1 bilhete.</p>
      <textarea rows={18} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder='{"versao":"1.0","casa":"Betano"}' />
      <p>
        <button onClick={lancar}>Lançar bilhete</button>
      </p>
      <p>{msg}</p>
    </section>
  );
}
