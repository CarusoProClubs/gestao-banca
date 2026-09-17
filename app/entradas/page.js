"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { entradasDoDia } from "../../lib/entradas";
import { orcamentoDoPeriodo } from "../../lib/periodo";
import { planoAlavancagem } from "../../lib/alavancagem";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function EntradasPage() {
  const [tickets, setTickets] = useState([]);
  const [settings, setSettings] = useState({ nivel_risco: "segura", percentual_lazer: 0.08, salario_mensal: 5000, periodicidade: "mensal" });

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.from("tickets").select("*").then(({ data }) => setTickets(data ?? []));
    supabase.from("bankroll_settings").select("*").limit(1).then(({ data }) => {
      if (data?.[0]) setSettings({ nivel_risco: "segura", ...data[0] });
    });
  }, []);

  const orcamento = orcamentoDoPeriodo(settings);
  const plano = planoAlavancagem(settings, orcamento);
  const { itens } = useMemo(() => entradasDoDia(tickets, settings.nivel_risco), [tickets, settings.nivel_risco]);

  return (
    <section>
      <section className="card">
        <h2>Melhores entradas</h2>
        <p>Isso não é palpite de jogo. É o recorte do que já funcionou na sua banca, no nível {plano.nome.toLowerCase()}.</p>
        <p>Stake sugerida agora: <strong>{money(plano.stake)}</strong> · odd até {plano.oddMax.toFixed(2)}</p>
      </section>
      {itens.map((item) => (
        <section className="card" key={item.titulo}>
          <h2>{item.titulo}</h2>
          <p>{item.motivo}</p>
        </section>
      ))}
    </section>
  );
}
