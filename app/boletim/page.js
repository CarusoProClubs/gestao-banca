"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";

export default function BoletimPage() {
  const [boletim, setBoletim] = useState([]);
  const [admin, setAdmin] = useState(false);
  const hoje = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.from("daily_entries").select("*").eq("data", hoje).order("created_at", { ascending: false }).then(({ data }) => setBoletim(data ?? []));
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      setAdmin(profile?.role === "admin");
    });
  }, [hoje]);

  return (
    <section className="card">
      <h2>Boletim do dia</h2>
      <p>Entradas gerais dos próximos eventos. Iguais para todos os clientes.</p>
      {admin && <p><Link href="/boletim/publicar">Publicar o boletim de hoje</Link></p>}
      {boletim.length === 0 ? (
        <p>Ainda não saiu boletim para hoje.</p>
      ) : (
        boletim.map((item) => (
          <div className="leg" key={item.id}>
            <strong>{item.titulo}</strong>
            <p>{item.evento} {item.mercado ? `· ${item.mercado}` : ""} {item.odd_sugerida ? `· odd ${item.odd_sugerida}` : ""}</p>
            <p className="muted">{item.nivel} · {item.motivo}</p>
          </div>
        ))
      )}
    </section>
  );
}
