"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";
import { rotuloMercado } from "../../lib/mercado-texto";

export default function BoletimPage() {
  const [boletim, setBoletim] = useState([]);
  const [admin, setAdmin] = useState(false);
  const hoje = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.from("daily_entries").select("*").eq("data", hoje).order("created_at", { ascending: true }).then(({ data }) => setBoletim(data ?? []));
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      setAdmin(profile?.role === "admin");
    });
  }, [hoje]);

  return (
    <section className="card">
      <h2>Boletim do dia</h2>
      <p>Melhores jogos de hoje, em qualquer esporte. Não é a lista da alavancagem.</p>
      {admin && <p><Link href="/boletim/publicar">Montar o boletim de hoje</Link></p>}
      {boletim.length === 0 ? (
        <p>Ainda não saiu boletim para hoje.</p>
      ) : (
        boletim.map((item) => (
          <div className="leg" key={item.id}>
            <strong>{item.evento || item.titulo}</strong>
            <p className="muted">
              {item.esporte || item.titulo} {item.liga ? `· ${item.liga}` : ""} {item.hora ? `· ${item.hora}` : ""}
            </p>
            <p>{rotuloMercado(item.mercado, item.evento)} {item.odd_sugerida ? `· odd ${item.odd_sugerida}` : ""}</p>
            {item.motivo && <p>{item.motivo}</p>}
          </div>
        ))
      )}
    </section>
  );
}
