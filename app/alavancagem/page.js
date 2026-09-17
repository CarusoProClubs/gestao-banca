"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";
import { NIVEIS, inicioSemana } from "../../lib/alavancagem";
import { filtrarBilhetes } from "../../lib/filtros";
import { lucroBilhete } from "../../lib/types";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function xsDoPlano(plano) {
  if (!plano) return { segura: 4, media: 7, alta: 12 };
  if (plano.x_baixa) {
    return {
      segura: Number(plano.x_baixa),
      media: Number(plano.x_media),
      alta: Number(plano.x_alta),
    };
  }
  const m = String(plano.nota || "").match(/^X\|([\d.]+)\|([\d.]+)\|([\d.]+)/);
  if (m) return { segura: Number(m[1]), media: Number(m[2]), alta: Number(m[3]) };
  return { segura: 4, media: 7, alta: 12 };
}

export default function AlavancagemPage() {
  const semana = inicioSemana();
  const [tickets, setTickets] = useState([]);
  const [meta, setMeta] = useState(null);
  const [plano, setPlano] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [admin, setAdmin] = useState(false);
  const [valor, setValor] = useState("");
  const [nivelEscolhido, setNivelEscolhido] = useState("segura");
  const [msg, setMsg] = useState("");

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
      setAdmin(profile?.role === "admin");
    }
    const { data: ticketRows } = await supabase.from("tickets").select("*");
    setTickets(ticketRows ?? []);
    const { data: metas } = await supabase.from("alavancagem_metas").select("*").eq("inicio", semana).limit(1);
    if (metas?.[0]) {
      setMeta(metas[0]);
      setValor(String(metas[0].valor_investido ?? ""));
      if (metas[0].nivel && NIVEIS[metas[0].nivel]) setNivelEscolhido(metas[0].nivel);
    }
    const { data: plans } = await supabase.from("weekly_plans").select("*").eq("inicio", semana).limit(1);
    setPlano(plans?.[0] || null);
    const { data: evs } = await supabase.from("weekly_events").select("*").eq("inicio", semana).order("data_evento", { ascending: true });
    setEventos(evs ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const xs = xsDoPlano(plano);
  const daSemana = useMemo(() => filtrarBilhetes(tickets, { periodo: "semana" }), [tickets]);
  const apostado = daSemana.reduce((acc, t) => acc + Number(t.valor_apostado || 0), 0);
  const lucro = daSemana.reduce((acc, t) => acc + lucroBilhete(t), 0);
  const retorno = apostado + lucro;
  const base = Number(valor || 0);
  const xAtual = Number(xs[nivelEscolhido] || 0);
  const multiploAtual = base > 0 ? retorno / base : 0;

  async function salvarValor() {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return setMsg("Entre em /login");
    if (!plano) return setMsg("Aguarde a tabela da semana ser publicada.");
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userData.user.id).single();
    const payload = {
      organization_id: profile.organization_id,
      inicio: semana,
      nivel: nivelEscolhido,
      valor_investido: Number(valor),
      multiplo_min: xAtual,
      multiplo_max: xAtual,
    };
    const { error } = meta
      ? await supabase.from("alavancagem_metas").update(payload).eq("id", meta.id)
      : await supabase.from("alavancagem_metas").insert(payload);
    setMsg(error ? error.message : "Valor da semana salvo");
    load();
  }

  return (
    <section>
      <section className="card">
        <h2>Alavancagem da semana</h2>
        <p>Semana começando em {semana.split("-").reverse().join("/")}.</p>
        {admin && <p><Link href="/alavancagem/semana">Enviar TXT / publicar tabela da semana</Link></p>}
        {!plano ? (
          <p className="muted">A tabela desta semana ainda não foi publicada.</p>
        ) : (
          <>
            <p className="muted">Toda semana tem os três níveis. O X (quantas vezes o dinheiro) muda dentro da faixa.</p>
            <div className="grid">
              {Object.values(NIVEIS).map((n) => (
                <article className="card" key={n.id}>
                  <h2>{n.nome}</h2>
                  <strong>{xs[n.id]}x</strong>
                  <p>faixa fixa {n.multiploMin}x–{n.multiploMax}x</p>
                  <p>Se investir {money(base || 0)} → alvo {money((base || 0) * xs[n.id])}</p>
                </article>
              ))}
            </div>
            <p>Qual nível você vai seguir nesta semana</p>
            <select value={nivelEscolhido} onChange={(e) => setNivelEscolhido(e.target.value)}>
              {Object.values(NIVEIS).map((n) => (
                <option key={n.id} value={n.id}>{n.nome} · {xs[n.id]}x</option>
              ))}
            </select>
            <p>Valor que você quer investir (R$)</p>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" />
            <p><button onClick={salvarValor}>Salvar meu valor</button></p>
          </>
        )}
        <p>{msg}</p>
      </section>

      <div className="grid">
        <article className="card">
          <h2>Alvo do nível escolhido</h2>
          <strong>{money(base * xAtual)}</strong>
          <p>{xAtual ? `${xAtual}x` : "—"} · {NIVEIS[nivelEscolhido].nome}</p>
        </article>
        <article className="card">
          <h2>Retorno atual</h2>
          <strong className={multiploAtual >= xAtual && xAtual ? "ok" : ""}>{money(retorno)}</strong>
          <p>{multiploAtual ? `${multiploAtual.toFixed(2)}x` : "0x"} até agora</p>
        </article>
        <article className="card">
          <h2>Lucro da semana</h2>
          <strong className={lucro >= 0 ? "ok" : "bad"}>{money(lucro)}</strong>
          <p>Apostado: {money(apostado)}</p>
        </article>
      </div>

      {Object.values(NIVEIS).map((n) => {
        const lista = eventos.filter((ev) => ev.nivel === n.id);
        return (
          <section className="card" key={n.id}>
            <h2>{n.nome} · {xs[n.id]}x</h2>
            {lista.length === 0 ? <p className="muted">Sem eventos neste nível.</p> : (
              <table>
                <thead>
                  <tr><th>Quando</th><th>Evento</th><th>Mercado</th><th>Odd</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {lista.map((ev) => (
                    <tr key={ev.id}>
                      <td>{[ev.data_evento, ev.horario].filter(Boolean).join(" ")}</td>
                      <td>{ev.esporte ? `${ev.esporte} · ` : ""}{ev.evento}</td>
                      <td>{ev.mercado || "—"}</td>
                      <td>{ev.odd_sugerida || "—"}</td>
                      <td className={ev.status === "cancelado" ? "bad" : ""}>{ev.status}{ev.motivo_alteracao ? ` · ${ev.motivo_alteracao}` : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </section>
  );
}
