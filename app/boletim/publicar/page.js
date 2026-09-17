"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../../../lib/supabase";

const VAZIO = {
  data: new Date().toISOString().slice(0, 10),
  esporte: "futebol",
  liga: "",
  evento: "",
  hora: "",
  mercado: "",
  odd_sugerida: "",
  motivo: "",
  principal: true,
};

export default function PublicarBoletimPage() {
  const [form, setForm] = useState(VAZIO);
  const [msg, setMsg] = useState("");
  const [lista, setLista] = useState([]);

  async function load() {
    const supabase = getSupabase();
    const { data } = await supabase.from("daily_entries").select("*").eq("data", form.data).order("created_at", { ascending: true });
    setLista(data ?? []);
  }

  useEffect(() => {
    load();
  }, [form.data]);

  async function salvar() {
    const supabase = getSupabase();
    const contexto = [form.esporte, form.liga, form.hora].filter(Boolean).join(" · ");
    const { error } = await supabase.from("daily_entries").insert({
      data: form.data,
      titulo: contexto || form.esporte,
      evento: form.evento,
      mercado: form.mercado,
      odd_sugerida: form.odd_sugerida ? Number(String(form.odd_sugerida).replace(",", ".")) : null,
      nivel: form.principal ? "principal" : "boletim",
      motivo: form.motivo,
    });
    setMsg(error ? error.message : "Jogo publicado no boletim.");
    if (!error) {
      setForm({ ...form, evento: "", mercado: "", odd_sugerida: "", motivo: "", hora: "" });
      load();
    }
  }

  async function apagar(id) {
    const supabase = getSupabase();
    await supabase.from("daily_entries").delete().eq("id", id);
    load();
  }

  return (
    <section className="card">
      <h2>Montar boletim do dia</h2>
      <p>Marque como principal o que deve aparecer na abertura da tela.</p>
      <p>Data</p>
      <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
      <p>Esporte</p>
      <input value={form.esporte} onChange={(e) => setForm({ ...form, esporte: e.target.value })} placeholder="futebol, basquete, NFL..." />
      <p>Liga</p>
      <input value={form.liga} onChange={(e) => setForm({ ...form, liga: e.target.value })} placeholder="Premier League, NBA..." />
      <p>Jogo</p>
      <input value={form.evento} onChange={(e) => setForm({ ...form, evento: e.target.value })} placeholder="Flamengo x Palmeiras" />
      <p>Hora</p>
      <input value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} placeholder="21:30" />
      <p>Mercado</p>
      <input value={form.mercado} onChange={(e) => setForm({ ...form, mercado: e.target.value })} placeholder="Vencedor da partida Flamengo" />
      <p>Odd</p>
      <input value={form.odd_sugerida} onChange={(e) => setForm({ ...form, odd_sugerida: e.target.value })} />
      <p>Por que entra hoje</p>
      <textarea rows={3} value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
      <p>
        <label>
          <input type="checkbox" checked={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.checked })} />{" "}
          Evento principal (aparece na abertura)
        </label>
      </p>
      <p>
        <button className="green" onClick={salvar}>Adicionar ao boletim</button>
      </p>
      <p>{msg}</p>
      <h2>Já no boletim deste dia</h2>
      {lista.map((item) => (
        <p key={item.id}>
          {item.nivel === "principal" ? "Destaque · " : ""}{item.evento} · {item.mercado}{" "}
          <button className="red" onClick={() => apagar(item.id)}>Apagar</button>
        </p>
      ))}
    </section>
  );
}
