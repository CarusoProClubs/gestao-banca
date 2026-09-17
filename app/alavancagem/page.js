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
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState({
    nivel: "segura",
    valor_investido: "",
    multiplo_min: 3,
    multiplo_max: 5,
  });
  const [msg, setMsg] = useState("");

  function aplicarNivel(nivel) {
    const preset = NIVEIS[nivel];
    setForm((atual) => ({
      ...atual,
      nivel,
      multiplo_min: preset.multiploMin,
      multiplo_max: preset.multiploMax,
    }));
  }

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: ticketRows } = await supabase.from("tickets").select("*");
    setTickets(ticketRows ?? []);
    const { data: metas } = await supabase.from("alavancagem_metas").select("*").eq("inicio", semana).limit(1);
    if (metas?.[0]) {
      setMeta(metas[0]);
      setForm({
        nivel: metas[0].nivel,
        valor_investido: String(metas[0].valor_investido),
        multiplo_min: Number(metas[0].multiplo_min),
        multiplo_max: Number(metas[0].multiplo_max),
      });
    }
  }

  useEffect(() => {
    load();
  }, []);

  const daSemana = useMemo(() => filtrarBilhetes(tickets, { periodo: "semana" }), [tickets]);
  const apostado = daSemana.reduce((acc, t) => acc + Number(t.valor_apostado || 0), 0);
  const lucro = daSemana.reduce((acc, t) => acc + lucroBilhete(t), 0);
  const retorno = apostado + lucro;
  const base = Number(form.valor_investido || apostado || 0);
  const alvoMin = base * Number(form.multiplo_min || 0);
  const alvoMax = base * Number(form.multiplo_max || 0);
  const multiploAtual = base > 0 ? retorno / base : 0;

  async function salvar() {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return setMsg("Entre em /login");
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userData.user.id).single();
    const payload = {
      organization_id: profile.organization_id,
      inicio: semana,
      nivel: form.nivel,
      valor_investido: Number(form.valor_investido),
      multiplo_min: Number(form.multiplo_min),
      multiplo_max: Number(form.multiplo_max),
    };
    const { error } = meta
      ? await supabase.from("alavancagem_metas").update(payload).eq("id", meta.id)
      : await supabase.from("alavancagem_metas").insert(payload);
    setMsg(error ? error.message : "Meta da semana salva");
    load();
  }

  return (
    <section>
      <section className="card">
        <h2>Alavancagem da semana</h2>
        <p>Semana começando em {semana.split("-").reverse().join("/")}.</p>
        <div className="presets">
          {Object.values(NIVEIS).map((nivel) => (
            <button key={nivel.id} className={form.nivel === nivel.id ? "active" : ""} onClick={() => aplicarNivel(nivel.id)}>
              {nivel.nome}
            </button>
          ))}
        </div>
        <p>{NIVEIS[form.nivel].texto}</p>
        <p>Valor investido na semana (R$)</p>
        <input value={form.valor_investido} onChange={(e) => setForm({ ...form, valor_investido: e.target.value })} />
        <div className="filters">
          <div>
            <p>Mínimo (X)</p>
            <input value={form.multiplo_min} onChange={(e) => setForm({ ...form, multiplo_min: e.target.value })} />
          </div>
          <div>
            <p>Máximo (X)</p>
            <input value={form.multiplo_max} onChange={(e) => setForm({ ...form, multiplo_max: e.target.value })} />
          </div>
        </div>
        <p>
          <button onClick={salvar}>Salvar meta da semana</button>
        </p>
        <p>{msg}</p>
      </section>

      <div className="grid">
        <article className="card">
          <h2>Meta mínima</h2>
          <strong>{money(alvoMin)}</strong>
          <p>{form.multiplo_min}x o investido</p>
        </article>
        <article className="card">
          <h2>Meta máxima</h2>
          <strong>{money(alvoMax)}</strong>
          <p>{form.multiplo_max}x o investido</p>
        </article>
        <article className="card">
          <h2>Retorno atual</h2>
          <strong className={multiploAtual >= Number(form.multiplo_min) ? "ok" : ""}>{money(retorno)}</strong>
          <p>{multiploAtual ? `${multiploAtual.toFixed(2)}x` : "0x"} até agora</p>
        </article>
        <article className="card">
          <h2>Lucro da semana</h2>
          <strong className={lucro >= 0 ? "ok" : "bad"}>{money(lucro)}</strong>
          <p>Apostado: {money(apostado)}</p>
        </article>
      </div>
    </section>
  );
}
