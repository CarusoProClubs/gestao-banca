"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { exposicaoPendente, lucroBilhete, orcamentoProtegido } from "../lib/types";
import { filtrarBilhetes } from "../lib/filtros";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Page() {
  const [settings, setSettings] = useState({ salario_mensal: 5000, percentual_lazer: 0.08 });
  const [tickets, setTickets] = useState([]);
  const [filtros, setFiltros] = useState({
    periodo: "mes",
    de: "",
    ate: "",
    casa: "",
    status: "",
    valorMin: "",
    valorMax: "",
    ordem: "data_desc",
  });

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: settingsRows } = await supabase.from("bankroll_settings").select("*").limit(1);
    if (settingsRows?.[0]) setSettings(settingsRows[0]);
    const { data } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });
    setTickets(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const lista = useMemo(() => filtrarBilhetes(tickets, filtros), [tickets, filtros]);
  const teto = orcamentoProtegido(settings);
  const lucro = lista.reduce((acc, ticket) => acc + lucroBilhete(ticket), 0);
  const apostado = lista.reduce((acc, ticket) => acc + Number(ticket.valor_apostado || 0), 0);
  const pendente = exposicaoPendente(lista);
  const comprometido = Number(settings.salario_mensal) > 0 ? apostado / Number(settings.salario_mensal) : 0;
  const casas = [...new Set(tickets.map((t) => t.casa).filter(Boolean))];

  async function setStatus(ticket, status_usuario) {
    const supabase = getSupabase();
    const lucroNovo = lucroBilhete({ ...ticket, status_usuario });
    await supabase.from("tickets").update({ status_usuario, lucro: lucroNovo }).eq("id", ticket.id);
    load();
  }

  return (
    <section>
      <div className="presets">
        {[
          ["mes", "Este mês"],
          ["semana", "7 dias"],
          ["semestre", "1 semestre"],
          ["ano", "1 ano"],
          ["custom", "Personalizado"],
        ].map(([id, label]) => (
          <button key={id} className={filtros.periodo === id ? "active" : ""} onClick={() => setFiltros({ ...filtros, periodo: id })}>
            {label}
          </button>
        ))}
      </div>
      {filtros.periodo === "custom" && (
        <div className="filters">
          <div>
            <p>De</p>
            <input type="date" value={filtros.de} onChange={(e) => setFiltros({ ...filtros, de: e.target.value })} />
          </div>
          <div>
            <p>Até</p>
            <input type="date" value={filtros.ate} onChange={(e) => setFiltros({ ...filtros, ate: e.target.value })} />
          </div>
        </div>
      )}
      <div className="grid">
        <article className="card">
          <h2>Orçamento protegido</h2>
          <strong>{money(teto)}</strong>
        </article>
        <article className="card">
          <h2>Lucro / prejuízo do período</h2>
          <strong className={lucro >= 0 ? "ok" : "bad"}>{money(lucro)}</strong>
        </article>
        <article className="card">
          <h2>Exposição pendente</h2>
          <strong>{money(pendente)}</strong>
        </article>
        <article className="card">
          <h2>Termômetro</h2>
          <strong className={comprometido <= Number(settings.percentual_lazer) ? "ok" : "bad"}>
            {comprometido <= Number(settings.percentual_lazer) ? "Seguro" : "Alerta"}
          </strong>
          <p>{(comprometido * 100).toFixed(1)}% do salário no período</p>
        </article>
      </div>

      <section className="card">
        <h2>Apostas do período</h2>
        <div className="filters">
          <div>
            <p>Casa</p>
            <select value={filtros.casa} onChange={(e) => setFiltros({ ...filtros, casa: e.target.value })}>
              <option value="">Todas</option>
              {casas.map((casa) => (
                <option key={casa} value={casa}>{casa}</option>
              ))}
            </select>
          </div>
          <div>
            <p>Status</p>
            <select value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}>
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="green">Green</option>
              <option value="red">Red</option>
            </select>
          </div>
          <div>
            <p>Valor mín.</p>
            <input value={filtros.valorMin} onChange={(e) => setFiltros({ ...filtros, valorMin: e.target.value })} />
          </div>
          <div>
            <p>Valor máx.</p>
            <input value={filtros.valorMax} onChange={(e) => setFiltros({ ...filtros, valorMax: e.target.value })} />
          </div>
          <div>
            <p>Ordenar</p>
            <select value={filtros.ordem} onChange={(e) => setFiltros({ ...filtros, ordem: e.target.value })}>
              <option value="data_desc">Data (mais recente)</option>
              <option value="odd_desc">Odd maior → menor</option>
              <option value="odd_asc">Odd menor → maior</option>
              <option value="valor_desc">Valor maior → menor</option>
              <option value="valor_asc">Valor menor → maior</option>
            </select>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Casa</th>
              <th>Título</th>
              <th>Valor</th>
              <th>Odd</th>
              <th>Status</th>
              <th>P/L</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr><td colSpan={8}>Nenhuma aposta neste filtro.</td></tr>
            ) : (
              lista.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{(ticket.data_hora || ticket.created_at || "").slice(0, 10)}</td>
                  <td>{ticket.casa ?? "—"}</td>
                  <td>{ticket.titulo ?? ticket.jogo ?? "—"}</td>
                  <td>{money(ticket.valor_apostado)}</td>
                  <td>{ticket.odd_bilhete ?? "—"}</td>
                  <td>{ticket.status_usuario}</td>
                  <td className={lucroBilhete(ticket) >= 0 ? "ok" : "bad"}>{money(lucroBilhete(ticket))}</td>
                  <td>
                    <button className="green" onClick={() => setStatus(ticket, "green")}>Green</button>{" "}
                    <button className="red" onClick={() => setStatus(ticket, "red")}>Red</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </section>
  );
}
