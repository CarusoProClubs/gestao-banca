"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../../../lib/supabase";
import { publicarAviso } from "../../../lib/notificacoes";
import { inicioSemana } from "../../../lib/alavancagem";

export default function PublicarPage() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    data: hoje,
    titulo: "",
    evento: "",
    mercado: "",
    odd_sugerida: "",
    nivel: "media",
    motivo: "",
  });
  const [msg, setMsg] = useState("");
  const [lista, setLista] = useState([]);

  async function load() {
    const supabase = getSupabase();
    const { data } = await supabase.from("daily_entries").select("*").eq("data", form.data).order("created_at", { ascending: false });
    setLista(data ?? []);
  }

  useEffect(() => {
    load();
  }, [form.data]);

  async function salvar() {
    const supabase = getSupabase();
    const { error } = await supabase.from("daily_entries").insert({
      data: form.data,
      titulo: form.titulo,
      evento: form.evento,
      mercado: form.mercado,
      odd_sugerida: form.odd_sugerida ? Number(form.odd_sugerida) : null,
      nivel: form.nivel,
      motivo: form.motivo,
    });
    if (error) return setMsg(error.message);
    await publicarAviso(supabase, {
      tipo: "alteracao",
      titulo: "Atualização no boletim do dia",
      corpo: `${form.titulo || form.evento || "Nova entrada"} · veja o boletim.`,
      link: "/boletim",
      inicio_semana: inicioSemana(),
    });
    setMsg("Publicado no boletim e aviso enviado no app.");
    setForm({ ...form, titulo: "", evento: "", mercado: "", odd_sugerida: "", motivo: "" });
    load();
  }

  return (
    <section className="card">
      <h2>Publicar boletim</h2>
      <p>Análise do dia. Se mudar a grade da semana, use também Alavancagem → tabela da semana.</p>
      <p>Data</p>
      <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
      <p>Título</p>
      <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
      <p>Evento (ex.: Flamengo x Palmeiras)</p>
      <input value={form.evento} onChange={(e) => setForm({ ...form, evento: e.target.value })} />
      <p>Mercado</p>
      <input value={form.mercado} onChange={(e) => setForm({ ...form, mercado: e.target.value })} />
      <p>Odd</p>
      <input value={form.odd_sugerida} onChange={(e) => setForm({ ...form, odd_sugerida: e.target.value })} />
      <p>Nível</p>
      <select value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })}>
        <option value="segura">Segura</option>
        <option value="media">Média</option>
        <option value="alta">Alto risco</option>
      </select>
      <p>Por que essa entrada</p>
      <textarea rows={4} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
      <p>
        <button onClick={salvar}>Publicar e avisar</button>
      </p>
      <p>{msg}</p>
      <h2>Já no ar neste dia</h2>
      {lista.map((item) => (
        <p key={item.id}>{item.titulo} · {item.evento}</p>
      ))}
    </section>
  );
}
