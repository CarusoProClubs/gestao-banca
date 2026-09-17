"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { filtrarBilhetes } from "../../lib/filtros";
import { resumirAnalise } from "../../lib/analise";
import { resumoMes, regrasSugeridas, sequencia } from "../../lib/disciplina";
import { orcamentoDoPeriodo, termometroFamiliar } from "../../lib/periodo";
import { exposicaoPendente, lucroBilhete } from "../../lib/types";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

export default function RelatorioPage() {
  const [tickets, setTickets] = useState([]);
  const [settings, setSettings] = useState({ salario_mensal: 5000, percentual_lazer: 0.08, periodicidade: "mensal" });

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.from("tickets").select("*").then(({ data }) => setTickets(data ?? []));
    supabase.from("bankroll_settings").select("*").limit(1).then(({ data }) => {
      if (data?.[0]) setSettings({ periodicidade: "mensal", ...data[0] });
    });
  }, []);

  const doMes = useMemo(() => filtrarBilhetes(tickets, { periodo: "mes" }), [tickets]);
  const mes = resumoMes(doMes);
  const geral = resumirAnalise(tickets);
  const orcamento = orcamentoDoPeriodo(settings);
  const lucro = doMes.reduce((acc, t) => acc + lucroBilhete(t), 0);
  const pendente = exposicaoPendente(doMes);
  const termo = termometroFamiliar({ lucro, pendente, orcamento });
  const { regras, seq } = regrasSugeridas(tickets, termo, orcamento);
  const agora = new Date().toLocaleDateString("pt-BR");

  return (
    <section className="card">
      <h2>Relatório do mês</h2>
      <p>Gerado em {agora}. Use imprimir do navegador para salvar em PDF.</p>
      <p>
        <button onClick={() => window.print()}>Imprimir / salvar PDF</button>
      </p>
      <p>Recebimento: {settings.periodicidade}</p>
      <p>Bilhetes no mês: {mes.total} · {mes.green} 🟢 · {mes.red} 🔴</p>
      <p>Apostado no mês: {money(mes.apostado)}</p>
      <p className={mes.lucro >= 0 ? "ok" : "bad"}>Resultado do mês: {money(mes.lucro)} · ROI {pct(mes.roi)}</p>
      <p>Teto do período: {money(orcamento)} · {termo.seguro ? "🟢 Seguro" : "🔴 Alerta"}</p>
      <p>Sequência atual: {seq.tamanho ? `${seq.tamanho} ${seq.tipo}` : "—"}</p>
      <h2>Regras para o próximo período</h2>
      <ul>
        {regras.map((regra) => (
          <li key={regra}>{regra}</li>
        ))}
      </ul>
      <h2>Histórico geral</h2>
      <p>Total na conta: {geral.total} bilhetes · acerto {pct(geral.acerto)} · lucro {money(geral.lucro)}</p>
      <p>Melhor mercado: {geral.porMercado[0]?.nome ?? "—"}</p>
      <p>Melhor clube: {geral.porClube[0]?.nome ?? "—"}</p>
      <p>Melhor jogador: {geral.porJogador[0]?.nome ?? "—"}</p>
    </section>
  );
}
