"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../lib/supabase";
import { rotuloMercado } from "../../lib/mercado-texto";

function esporteDe(item) {
  return (item.esporte || item.titulo || "").split(" · ")[0].trim() || "Outros";
}

function principalDe(item) {
  return item.nivel === "principal" || item.destaque === true;
}

export default function BoletimPage() {
  const [boletim, setBoletim] = useState([]);
  const [admin, setAdmin] = useState(false);
  const [filtro, setFiltro] = useState("principais");
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

  const esportes = useMemo(
    () => [...new Set(boletim.map(esporteDe).filter(Boolean))],
    [boletim],
  );

  const lista = useMemo(() => {
    if (filtro === "principais") return boletim.filter(principalDe);
    if (filtro === "todos") return boletim;
    return boletim.filter((item) => esporteDe(item).toLowerCase() === filtro.toLowerCase());
  }, [boletim, filtro]);

  return (
    <section>
      <section className="card">
        <h2>Boletim do dia</h2>
        <p>Os destaques abrem primeiro. Use o filtro se quiser um esporte só.</p>
        {admin && <p><Link href="/boletim/publicar">Montar o boletim de hoje</Link></p>}
        <div className="presets">
          <button className={filtro === "principais" ? "active" : ""} onClick={() => setFiltro("principais")}>
            Principais
          </button>
          <button className={filtro === "todos" ? "active" : ""} onClick={() => setFiltro("todos")}>
            Todos
          </button>
          {esportes.map((esporte) => (
            <button key={esporte} className={filtro.toLowerCase() === esporte.toLowerCase() ? "active" : ""} onClick={() => setFiltro(esporte)}>
              {esporte}
            </button>
          ))}
        </div>
      </section>

      {lista.length === 0 ? (
        <section className="card">
          <p>{filtro === "principais" ? "Nenhum destaque publicado hoje." : "Nenhum jogo neste filtro."}</p>
        </section>
      ) : (
        lista.map((item) => (
          <article className="card" key={item.id}>
            {principalDe(item) && <p className="ok">Destaque</p>}
            <h2>{item.evento || item.titulo}</h2>
            <p className="muted">
              {esporteDe(item)}
              {item.liga ? ` · ${item.liga}` : ""}
              {item.hora ? ` · ${item.hora}` : ""}
              {!item.liga && item.titulo?.includes("·") ? ` · ${item.titulo}` : ""}
            </p>
            <p>{rotuloMercado(item.mercado, item.evento)} {item.odd_sugerida ? `· odd ${item.odd_sugerida}` : ""}</p>
            {item.motivo && <p>{item.motivo}</p>}
          </article>
        ))
      )}
    </section>
  );
}
