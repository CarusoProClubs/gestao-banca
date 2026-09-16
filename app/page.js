"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { exposicaoPendente, lucroBilhete, orcamentoProtegido } from "../lib/types";

export default function Page() {
  const [settings, setSettings] = useState({
    salario_mensal: 5000,
    percentual_lazer: 0.08,
  });
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.from("bankroll_settings").select("*").limit(1).then(({ data }) => {
      if (data?.[0]) setSettings(data[0]);
    });
    supabase.from("tickets").select("*").then(({ data }) => setTickets(data ?? []));
  }, []);

  const teto = orcamentoProtegido(settings);
  const lucro = tickets.reduce((acc, ticket) => acc + lucroBilhete(ticket), 0);
  const apostado = tickets.reduce((acc, ticket) => acc + Number(ticket.valor_apostado || 0), 0);
  const pendente = exposicaoPendente(tickets);
  const comprometido = Number(settings.salario_mensal) > 0 ? apostado / Number(settings.salario_mensal) : 0;
  const seguro = comprometido <= Number(settings.percentual_lazer);

  return (
    <section>
      <div className="grid">
        <article className="card">
          <h2>Orçamento protegido</h2>
          <strong>
            {teto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </strong>
        </article>
        <article className="card">
          <h2>Lucro / prejuízo</h2>
          <strong className={lucro >= 0 ? "ok" : "bad"}>
            {lucro.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </strong>
        </article>
        <article className="card">
          <h2>Exposição pendente</h2>
          <strong>
            {pendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </strong>
        </article>
        <article className="card">
          <h2>Termômetro</h2>
          <strong className={seguro ? "ok" : "bad"}>{seguro ? "Seguro" : "Alerta"}</strong>
          <p>{(comprometido * 100).toFixed(1)}% do salário apostado</p>
        </article>
      </div>
    </section>
  );
}
