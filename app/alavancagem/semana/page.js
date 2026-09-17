"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../../lib/supabase";
import { NIVEIS, faixaPorQuantidade, inicioSemana } from "../../../lib/alavancagem";
import { publicarAviso } from "../../../lib/notificacoes";

const VAZIO = {
  data_evento: "",
  horario: "",
  esporte: "",
  evento: "",
  mercado: "",
  odd_sugerida: "",
  nivel: "segura",
  motivo: "",
};

export default function SemanaAdminPage() {
  const semana = inicioSemana();
  const [admin, setAdmin] = useState(false);
  const [plano, setPlano] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [form, setForm] = useState(VAZIO);
  const [nota, setNota] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setMsg("Entre em /login");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
    setAdmin(profile?.role === "admin");
    const { data: plans } = await supabase.from("weekly_plans").select("*").eq("inicio", semana).limit(1);
    setPlano(plans?.[0] || null);
    setNota(plans?.[0]?.nota || "");
    const { data: evs } = await supabase.from("weekly_events").select("*").eq("inicio", semana).order("data_evento", { ascending: true });
    setEventos(evs ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  const ativos = eventos.filter((ev) => ev.status !== "cancelado");
  const faixa = useMemo(() => faixaPorQuantidade(ativos.length), [ativos.length]);

  async function publicarPlano() {
    const supabase = getSupabase();
    const payload = {
      inicio: semana,
      nivel: faixa.id,
      multiplo_min: faixa.multiploMin,
      multiplo_max: faixa.multiploMax,
      qtd_eventos: ativos.length,
      status: "publicado",
      nota,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error } = plano
      ? await supabase.from("weekly_plans").update(payload).eq("id", plano.id)
      : await supabase.from("weekly_plans").insert(payload);
    if (error) return setMsg(error.message);
    await publicarAviso(supabase, {
      tipo: "tabela_semana",
      titulo: "Tabela da semana disponível",
      corpo: `${ativos.length} evento(s) · ${faixa.nome} · meta ${faixa.multiploMin}x a ${faixa.multiploMax}x. Informe só o valor que vai investir.`,
      link: "/alavancagem",
      inicio_semana: semana,
    });
    setMsg("Tabela publicada e aviso enviado no app.");
    load();
  }

  async function adicionar() {
    if (!form.evento.trim()) return setMsg("Preencha o evento.");
    const supabase = getSupabase();
    const { error } = await supabase.from("weekly_events").insert({
      inicio: semana,
      data_evento: form.data_evento || null,
      horario: form.horario || null,
      esporte: form.esporte || null,
      evento: form.evento,
      mercado: form.mercado || null,
      odd_sugerida: form.odd_sugerida ? Number(form.odd_sugerida) : null,
      nivel: form.nivel,
      motivo: form.motivo || null,
      status: "ativo",
    });
    if (error) return setMsg(error.message);
    setForm(VAZIO);
    setMsg("Evento incluído. Publique de novo para travar a faixa e avisar os clientes.");
    load();
  }

  async function alterar(ev, patch, avisar) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("weekly_events")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", ev.id);
    if (error) return setMsg(error.message);
    if (avisar) {
      await publicarAviso(supabase, {
        tipo: "alteracao",
        titulo: patch.status === "cancelado" ? "Evento removido da tabela" : "Alteração na tabela da semana",
        corpo: `${ev.evento}${patch.motivo_alteracao ? ` — ${patch.motivo_alteracao}` : ""}`,
        link: "/alavancagem",
        inicio_semana: semana,
      });
    }
    setMsg(avisar ? "Alteração publicada e aviso enviado." : "Salvo.");
    load();
  }

  if (!admin) {
    return (
      <section className="card">
        <h2>Tabela da semana</h2>
        <p>Só o admin publica a grade. Cliente vê em <Link href="/alavancagem">Alavancagem</Link>.</p>
        <p>{msg}</p>
      </section>
    );
  }

  return (
    <section>
      <section className="card">
        <h2>Publicar tabela da semana</h2>
        <p>Semana de {semana.split("-").reverse().join("/")} · {ativos.length} evento(s) ativo(s).</p>
        <p>
          Faixa calculada pela quantidade: <strong>{faixa.nome}</strong> · {faixa.multiploMin}x a {faixa.multiploMax}x.
          O cliente não escolhe isso.
        </p>
        <p>Nota interna (opcional)</p>
        <textarea rows={2} value={nota} onChange={(e) => setNota(e.target.value)} />
        <p>
          <button className="green" onClick={publicarPlano}>Publicar tabela e avisar no app</button>
        </p>
        <p className="muted">Domingo: monte a lista e publique. Durante a semana: altere um evento e o aviso sai na hora.</p>
        <p>{msg}</p>
      </section>

      <section className="card">
        <h2>Incluir evento</h2>
        <div className="filters">
          <div>
            <p>Data</p>
            <input type="date" value={form.data_evento} onChange={(e) => setForm({ ...form, data_evento: e.target.value })} />
          </div>
          <div>
            <p>Horário</p>
            <input value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} placeholder="16:00" />
          </div>
          <div>
            <p>Esporte</p>
            <input value={form.esporte} onChange={(e) => setForm({ ...form, esporte: e.target.value })} />
          </div>
        </div>
        <p>Evento</p>
        <input value={form.evento} onChange={(e) => setForm({ ...form, evento: e.target.value })} placeholder="Time A x Time B" />
        <p>Mercado</p>
        <input value={form.mercado} onChange={(e) => setForm({ ...form, mercado: e.target.value })} />
        <p>Odd</p>
        <input value={form.odd_sugerida} onChange={(e) => setForm({ ...form, odd_sugerida: e.target.value })} />
        <p>Nível desta linha</p>
        <select value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
          {Object.values(NIVEIS).map((n) => (
            <option key={n.id} value={n.id}>{n.nome}</option>
          ))}
        </select>
        <p>Por que entra</p>
        <textarea rows={3} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
        <p><button onClick={adicionar}>Adicionar na grade</button></p>
      </section>

      <section className="card">
        <h2>Grade atual</h2>
        {eventos.map((ev) => (
          <div className="leg" key={ev.id}>
            <strong>{ev.evento}</strong>
            <p className="muted">
              {[ev.data_evento, ev.horario, ev.esporte, ev.mercado, ev.odd_sugerida].filter(Boolean).join(" · ")} · {ev.status}
            </p>
            {ev.motivo_alteracao && <p className="muted">Alteração: {ev.motivo_alteracao}</p>}
            <p>
              <button
                onClick={() => {
                  const motivo = window.prompt("O que mudou? (sai no aviso)", ev.motivo_alteracao || "");
                  if (motivo == null) return;
                  alterar(ev, { status: "alterado", motivo_alteracao: motivo }, true);
                }}
              >
                Registrar alteração e avisar
              </button>{" "}
              <button
                className="red"
                onClick={() => {
                  const motivo = window.prompt("Por que sai da tabela?", "Desfalque / jogo morto");
                  if (motivo == null) return;
                  alterar(ev, { status: "cancelado", motivo_alteracao: motivo }, true);
                }}
              >
                Cancelar e avisar
              </button>
            </p>
          </div>
        ))}
      </section>
    </section>
  );
}
