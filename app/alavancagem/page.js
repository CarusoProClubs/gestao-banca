"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [metaId, setMetaId] = useState(null);
  const [nivel, setNivel] = useState("segura");
  const [valorSemana, setValorSemana] = useState("100");
  const [msg, setMsg] = useState("");

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: ticketRows } = await supabase.from("tickets").select("*");
    setTickets(ticketRows ?? []);
    const { data: metas } = await supabase.from("alavancagem_metas").select("*").eq("inicio", semana).limit(1);
    if (metas?.[0]) {
      setMetaId(metas[0].id);
      setNivel(metas[0].nivel || "segura");
      setValorSemana(String(metas[0].valor_investido ?? ""));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const base = Number(String(valorSemana).replace(",", ".")) || 0;
  const daSemana = useMemo(() => filtrarBilhetes(tickets, { periodo: "semana" }), [tickets]);
  const apostado = daSemana.reduce((acc, t) => acc + Number(t.valor_apostado || 0), 0);
  const lucro = daSemana.reduce((acc, t) => acc + lucroBilhete(t), 0);
  const retorno = apostado + lucro;
  const multiploAtual = base > 0 ? retorno / base : 0;
  const atual = NIVEIS[nivel];

  async function salvar() {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return setMsg("Entre em /login");
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userData.user.id).single();
    const payload = {
      organization_id: profile.organization_id,
      inicio: semana,
      nivel,
      valor_investido: base,
      multiplo_min: atual.multiploMin,
      multiplo_max: atual.multiploMax,
    };
    const query = metaId
      ? supabase.from("alavancagem_metas").update(payload).eq("id", metaId)
      : supabase.from("alavancagem_metas").insert(payload);
    const { error } = await query;
    setMsg(error ? error.message : "Meta da semana salva");
    load();
  }

  return (
    <section>
      <section className="card">
        <h2>Alavancagem da semana</h2>
        <p>Semana de {semana.split("-").reverse().join("/")}. Informe só o valor que entra nesta semana.</p>
        <p>Valor da semana (R$)</p>
        <input value={valorSemana} onChange={(e) => setValorSemana(e.target.value)} />
        <p>
          <button onClick={salvar}>Salvar valor da semana</button>
        </p>
        <p>{msg}</p>
      </section>

      <div className="grid">
        {Object.values(NIVEIS).map((item) => (
          <article key={item.id} className="card" style={{ outline: nivel === item.id ? "2px solid #6ea8ff" : "none" }}>
            <h2>{item.nome}</h2>
            <p>
              Com {money(base)} nesta semana, a meta é devolver {money(base * item.multiploMin)} a {money(base * item.multiploMax)} ({item.multiploMin}x a {item.multiploMax}x).
            </p>
            <p>
              <button className={nivel === item.id ? "active" : ""} onClick={() => setNivel(item.id)}>
                Usar este nível
              </button>
            </p>
          </article>
        ))}
      </div>

      <div className="grid">
        <article className="card">
          <h2>Retorno atual</h2>
          <strong>{money(retorno)}</strong>
          <p>{base ? `${multiploAtual.toFixed(2)}x` : "0x"} de {money(base)}</p>
        </article>
        <article className="card">
          <h2>Lucro da semana</h2>
          <strong className={lucro >= 0 ? "ok" : "bad"}>{money(lucro)}</strong>
          <p>Apostado nos bilhetes: {money(apostado)}</p>
        </article>
      </div>
    </section>
  );
}
