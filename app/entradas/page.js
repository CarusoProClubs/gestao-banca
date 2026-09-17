"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  const [boletim, setBoletim] = useState([]);
  const [admin, setAdmin] = useState(false);
  const hoje = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.from("tickets").select("*").then(({ data }) => setTickets(data ?? []));
    supabase.from("bankroll_settings").select("*").limit(1).then(({ data }) => {
      if (data?.[0]) setSettings({ nivel_risco: "segura", ...data[0] });
    });
    supabase.from("daily_entries").select("*").eq("data", hoje).order("created_at", { ascending: false }).then(({ data }) => setBoletim(data ?? []));
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      setAdmin(profile?.role === "admin");
    });
  }, [hoje]);

  const orcamento = orcamentoDoPeriodo(settings);
  const plano = planoAlavancagem(settings, orcamento);
  const individual = useMemo(() => entradasDoDia(tickets, settings.nivel_risco), [tickets, settings.nivel_risco]);

  return (
    <section>
      <section className="card">
        <h2>Boletim do dia</h2>
        <p>Eventos gerais, iguais para todo mundo. Não entra a banca de ninguém aqui.</p>
        {admin && <p><Link href="/entradas/publicar">Publicar entradas de hoje</Link></p>}
        {boletim.length === 0 ? (
          <p>Ainda não saiu boletim para hoje.</p>
        ) : (
          boletim.map((item) => (
            <div className="leg" key={item.id}>
              <strong>{item.titulo}</strong>
              <p>{item.evento} {item.mercado ? `· ${item.mercado}` : ""} {item.odd_sugerida ? `· odd ${item.odd_sugerida}` : ""}</p>
              <p className="muted">{item.nivel} · {item.motivo}</p>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h2>Só a sua banca</h2>
        <p>Stake sugerida no nível {plano.nome.toLowerCase()}: <strong>{money(plano.stake)}</strong></p>
        {individual.itens.map((item) => (
          <div className="leg" key={item.titulo}>
            <strong>{item.titulo}</strong>
            <p>{item.motivo}</p>
          </div>
        ))}
      </section>
    </section>
  );
}
