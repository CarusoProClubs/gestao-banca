"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { resumirAnalise } from "../../lib/analise";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function Tabela({ titulo, rows }) {
  return (
    <section className="card">
      <h2>{titulo}</h2>
      <table>
        <thead>
          <tr>
            <th>Grupo</th>
            <th>Qtd</th>
            <th>🟢 Green</th>
            <th>🔴 Red</th>
            <th>Acerto</th>
            <th>Apostado</th>
            <th>Lucro</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={7}>Sem dados ainda.</td></tr>
          ) : (
            rows.map((row) => (
              <tr key={row.nome}>
                <td>{row.nome}</td>
                <td>{row.qtd}</td>
                <td className="ok">{row.green}</td>
                <td className="bad">{row.red}</td>
                <td>{pct(row.acerto)}</td>
                <td>{money(row.apostado)}</td>
                <td className={row.lucro >= 0 ? "ok" : "bad"}>{money(row.lucro)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

export default function AnalisePage() {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.from("tickets").select("*").then(({ data }) => setTickets(data ?? []));
  }, []);

  const analise = useMemo(() => resumirAnalise(tickets), [tickets]);
  const melhorMercado = analise.porMercado[0];
  const piorMercado = [...analise.porMercado].sort((a, b) => a.lucro - b.lucro)[0];
  const melhorFaixa = analise.porFaixaOdd[0];
  const melhorClube = analise.porClube[0];
  const melhorJogador = analise.porJogador[0];

  return (
    <section>
      <p>Análise de todos os bilhetes deste perfil, sem recorte de data.</p>
      <div className="grid">
        <article className="card">
          <h2>Bilhetes</h2>
          <strong>{analise.total}</strong>
          <p>{analise.green} 🟢 · {analise.red} 🔴 · {analise.pendente} pendente</p>
        </article>
        <article className="card">
          <h2>Acerto</h2>
          <strong>{pct(analise.acerto)}</strong>
        </article>
        <article className="card">
          <h2>ROI</h2>
          <strong className={analise.roi >= 0 ? "ok" : "bad"}>{pct(analise.roi)}</strong>
        </article>
        <article className="card">
          <h2>Lucro</h2>
          <strong className={analise.lucro >= 0 ? "ok" : "bad"}>{money(analise.lucro)}</strong>
        </article>
      </div>
      <section className="card">
        <h2>Leitura rápida</h2>
        <p>Melhor mercado: {melhorMercado ? `${melhorMercado.nome} (${money(melhorMercado.lucro)})` : "—"}</p>
        <p>Pior mercado: {piorMercado ? `${piorMercado.nome} (${money(piorMercado.lucro)})` : "—"}</p>
        <p>Faixa de odd: {melhorFaixa ? `${melhorFaixa.nome} (${money(melhorFaixa.lucro)})` : "—"}</p>
        <p>Clube que mais lucrou: {melhorClube ? `${melhorClube.nome} (${money(melhorClube.lucro)})` : "—"}</p>
        <p>Jogador que mais lucrou: {melhorJogador ? `${melhorJogador.nome} (${money(melhorJogador.lucro)})` : "—"}</p>
      </section>
      <Tabela titulo="Por mercado" rows={analise.porMercado} />
      <Tabela titulo="Por faixa de odd" rows={analise.porFaixaOdd} />
      <Tabela titulo="Por tipo de bilhete" rows={analise.porTipo} />
      <Tabela titulo="Por casa" rows={analise.porCasa} />
      <Tabela titulo="Por liga" rows={analise.porLiga} />
      <Tabela titulo="Por clube" rows={analise.porClube} />
      <Tabela titulo="Por jogador" rows={analise.porJogador} />
    </section>
  );
}
