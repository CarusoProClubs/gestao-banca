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

export default function AlavancagemPage() {
  const semana = inicioSemana();
  const [tickets, setTickets] = useState([]);
  const [meta, setMeta] = useState(null);
  const [plano, setPlano] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [admin, setAdmin] = useState(false);
  const [valor, setValor] = useState("");
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
    }
    const { data: plans } = await supabase.from("weekly_plans").select("*").eq("inicio", semana).limit(1);
    setPlano(plans?.[0] || null);
    const { data: evs } = await supabase.from("weekly_events").select("*").eq("inicio", semana).order("data_evento", { ascending: true });
    setEventos(evs ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const faixa = plano ? NIVEIS[plano.nivel] || NIVEIS.segura : null;
  const daSemana = useMemo(() => filtrarBilhetes(tickets, { periodo: "semana" }), [tickets]);
  const apostado = daSemana.reduce((acc, t) => acc + Number(t.valor_apostado || 0), 0);
  const lucro = daSemana.reduce((acc, t) => acc + lucroBilhete(t), 0);
  const retorno = apostado + lucro;
  const base = Number(valor || 0);
  const minX = Number(plano?.multiplo_min || faixa?.multiploMin || 0);
  const maxX = Number(plano?.multiplo_max || faixa?.multiploMax || 0);
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
      nivel: plano.nivel,
      valor_investido: Number(valor),
      multiplo_min: minX,
      multiplo_max: maxX,
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
        {admin && (
          <p><Link href="/alavancagem/semana">Publicar / alterar tabela da semana</Link></p>
        )}
        {!plano ? (
          <p className="muted">A faixa e a tabela desta semana ainda não foram publicadas. Você só informa o valor depois que o aviso sair.</p>
        ) : (
          <>
            <div className="presets">
              <button className="active" type="button">{faixa.nome}</button>
            </div>
            <p>{faixa.texto}</p>
            <p className="muted">A faixa não é escolhida por você. Ela entra de acordo com a quantidade de eventos da semana ({plano.qtd_eventos}).</p>
            <p>Valor que você quer investir nesta semana (R$)</p>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" />
            <p>
              <button onClick={salvarValor}>Salvar meu valor</button>
            </p>
          </>
        )}
        <p>{msg}</p>
      </section>

      <div className="grid">
        <article className="card">
          <h2>Meta mínima</h2>
          <strong>{money(base * minX)}</strong>
          <p>{minX ? `${minX}x o investido` : "Aguardando faixa"}</p>
        </article>
        <article className="card">
          <h2>Meta máxima</h2>
          <strong>{money(base * maxX)}</strong>
          <p>{maxX ? `${maxX}x o investido` : "Aguardando faixa"}</p>
        </article>
        <article className="card">
          <h2>Retorno atual</h2>
          <strong className={multiploAtual >= minX && minX ? "ok" : ""}>{money(retorno)}</strong>
          <p>{multiploAtual ? `${multiploAtual.toFixed(2)}x` : "0x"} até agora</p>
        </article>
        <article className="card">
          <h2>Lucro da semana</h2>
          <strong className={lucro >= 0 ? "ok" : "bad"}>{money(lucro)}</strong>
          <p>Apostado: {money(apostado)}</p>
        </article>
      </div>

      <section className="card">
        <h2>Tabela da semana</h2>
        {eventos.length === 0 ? (
          <p className="muted">Nenhum evento publicado ainda.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Evento</th>
                <th>Mercado</th>
                <th>Odd</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((ev) => (
                <tr key={ev.id}>
                  <td>{[ev.data_evento, ev.horario].filter(Boolean).join(" ")}</td>
                  <td>{ev.esporte ? `${ev.esporte} · ` : ""}{ev.evento}</td>
                  <td>{ev.mercado || "—"}</td>
                  <td>{ev.odd_sugerida || "—"}</td>
                  <td className={ev.status === "cancelado" ? "bad" : ev.status === "alterado" ? "ok" : ""}>
                    {ev.status}
                    {ev.motivo_alteracao ? ` · ${ev.motivo_alteracao}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}
