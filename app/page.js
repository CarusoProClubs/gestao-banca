"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { exposicaoPendente, lucroBilhete } from "../lib/types";
import { filtrarBilhetes } from "../lib/filtros";
import { limitesSalario, orcamentoDoPeriodo, termometroFamiliar } from "../lib/periodo";
import { nomeMercado, nomeTipo } from "../lib/mercados";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pernasDoBilhete(ticket) {
  const lista = ticket?.payload?.pernas || [];
  return Array.isArray(lista) ? lista : [];
}

export default function Page() {
  const [settings, setSettings] = useState({
    salario_mensal: 5000,
    percentual_lazer: 0.08,
    periodicidade: "mensal",
  });
  const [tickets, setTickets] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [filtros, setFiltros] = useState({
    periodo: "salario",
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
    if (settingsRows?.[0]) setSettings({ periodicidade: "mensal", ...settingsRows[0] });
    const { data } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });
    setTickets(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const periodicidade = settings.periodicidade || "mensal";
  const faixa = limitesSalario(periodicidade);
  const lista = useMemo(
    () => filtrarBilhetes(tickets, { ...filtros, periodicidade }),
    [tickets, filtros, periodicidade],
  );
  const orcamento = orcamentoDoPeriodo(settings);
  const lucro = lista.reduce((acc, ticket) => acc + lucroBilhete(ticket), 0);
  const pendente = exposicaoPendente(lista);
  const termo = termometroFamiliar({ lucro, pendente, orcamento });
  const casas = [...new Set(tickets.map((t) => t.casa).filter(Boolean))];

  async function setStatus(ticket, status_usuario) {
    const supabase = getSupabase();
    const lucroNovo = lucroBilhete({ ...ticket, status_usuario });
    await supabase.from("tickets").update({ status_usuario, lucro: lucroNovo }).eq("id", ticket.id);
    load();
    setAberto((atual) => (atual && atual.id === ticket.id ? { ...atual, status_usuario, lucro: lucroNovo } : atual));
  }

  return (
    <section>
      <div className="presets">
        <button className={filtros.periodo === "salario" ? "active" : ""} onClick={() => setFiltros({ ...filtros, periodo: "salario" })}>
          {faixa.rotulo}
        </button>
        <button className={filtros.periodo === "semana" ? "active" : ""} onClick={() => setFiltros({ ...filtros, periodo: "semana" })}>
          7 dias
        </button>
        <button className={filtros.periodo === "mes" ? "active" : ""} onClick={() => setFiltros({ ...filtros, periodo: "mes" })}>
          Este mês
        </button>
        <button className={filtros.periodo === "semestre" ? "active" : ""} onClick={() => setFiltros({ ...filtros, periodo: "semestre" })}>
          1 semestre
        </button>
        <button className={filtros.periodo === "ano" ? "active" : ""} onClick={() => setFiltros({ ...filtros, periodo: "ano" })}>
          1 ano
        </button>
        <button className={filtros.periodo === "custom" ? "active" : ""} onClick={() => setFiltros({ ...filtros, periodo: "custom" })}>
          Personalizado
        </button>
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
          <h2>Teto do período</h2>
          <strong>{money(orcamento)}</strong>
          <p>Recebimento {periodicidade}</p>
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
          <h2>Termômetro familiar</h2>
          <strong className={termo.seguro ? "ok" : "bad"}>{termo.seguro ? "Seguro" : "Alerta"}</strong>
          <p>Uso do caixa: {money(termo.consumo)} de {money(orcamento)}</p>
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
                <tr key={ticket.id} className="clickable" onClick={() => setAberto(ticket)}>
                  <td>{(ticket.data_hora || ticket.created_at || "").slice(0, 10)}</td>
                  <td>{ticket.casa ?? "—"}</td>
                  <td>{ticket.titulo ?? ticket.jogo ?? "—"}</td>
                  <td>{money(ticket.valor_apostado)}</td>
                  <td>{ticket.odd_bilhete ?? "—"}</td>
                  <td>{ticket.status_usuario}</td>
                  <td className={lucroBilhete(ticket) >= 0 ? "ok" : "bad"}>{money(lucroBilhete(ticket))}</td>
                  <td onClick={(event) => event.stopPropagation()}>
                    <button className="green" onClick={() => setStatus(ticket, "green")}>Green</button>{" "}
                    <button className="red" onClick={() => setStatus(ticket, "red")}>Red</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {aberto && (
        <div className="overlay" onClick={() => setAberto(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <p className="muted">{aberto.casa} · {nomeTipo(aberto.tipo, aberto.formato)} · ID {aberto.id_casa ?? "—"}</p>
            <h3>{aberto.titulo || aberto.jogo || "Bilhete"}</h3>
            <p>{money(aberto.valor_apostado)} · odd {aberto.odd_bilhete ?? "—"} · {aberto.status_usuario}</p>
            <p className={lucroBilhete(aberto) >= 0 ? "ok" : "bad"}>P/L {money(lucroBilhete(aberto))}</p>
            {pernasDoBilhete(aberto).length === 0 ? (
              <p className="muted">Sem pernas salvas neste bilhete.</p>
            ) : (
              pernasDoBilhete(aberto).map((perna) => (
                <div className="leg" key={perna.ordem || perna.selecao}>
                  <strong>{perna.selecao || "Palpite"}</strong>
                  <p className="muted">{perna.jogo || aberto.jogo || ""}</p>
                  <p>{nomeMercado(perna.mercado)} {perna.odd_perna ? `· ${perna.odd_perna}` : ""}</p>
                </div>
              ))
            )}
            <p>
              <button className="green" onClick={() => setStatus(aberto, "green")}>Green</button>{" "}
              <button className="red" onClick={() => setStatus(aberto, "red")}>Red</button>{" "}
              <button onClick={() => setAberto(null)}>Fechar</button>
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
