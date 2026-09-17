"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../lib/supabase";

export default function Notificacoes() {
  const [aberta, setAberta] = useState(false);
  const [itens, setItens] = useState([]);
  const [lidas, setLidas] = useState([]);
  const [userId, setUserId] = useState(null);

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    setUserId(auth.user.id);
    const { data: avisos } = await supabase
      .from("app_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setItens(avisos ?? []);
    const { data: reads } = await supabase
      .from("notification_reads")
      .select("notification_id")
      .eq("user_id", auth.user.id);
    setLidas((reads ?? []).map((row) => row.notification_id));
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  const pendentes = itens.filter((item) => !lidas.includes(item.id));

  async function marcarTodas() {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    const novas = pendentes.map((item) => ({
      notification_id: item.id,
      user_id: userId,
    }));
    if (novas.length) await supabase.from("notification_reads").insert(novas);
    load();
  }

  return (
    <div className="bell-wrap">
      <button className="bell" onClick={() => setAberta((v) => !v)} aria-label="Notificações">
        Avisos{pendentes.length ? ` (${pendentes.length})` : ""}
      </button>
      {aberta && (
        <div className="bell-panel">
          <div className="bell-head">
            <strong>Avisos</strong>
            {pendentes.length > 0 && (
              <button onClick={marcarTodas}>Marcar lidas</button>
            )}
          </div>
          {itens.length === 0 && <p className="muted">Nenhum aviso ainda.</p>}
          {itens.map((item) => (
            <Link
              key={item.id}
              href={item.link || "/alavancagem"}
              className={lidas.includes(item.id) ? "bell-item" : "bell-item nova"}
              onClick={() => setAberta(false)}
            >
              <b>{item.titulo}</b>
              <span>{item.corpo}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
