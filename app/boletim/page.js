"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { parseBoletimTxt } from "../../lib/boletim-txt";
import { textoLimpo } from "../../lib/texto-limpo";

export default function BoletimPage() {
  const hoje = new Date().toISOString().slice(0, 10);
  const arquivoRef = useRef(null);
  const [admin, setAdmin] = useState(false);
  const [parsed, setParsed] = useState(parseBoletimTxt(""));
  const [filtro, setFiltro] = useState("principais");
  const [aberto, setAberto] = useState(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      setAdmin(profile?.role === "admin");
    }
    const { data } = await supabase.from("boletim_txt").select("*").eq("data", hoje).limit(1);
    if (data?.[0]) setParsed(parseBoletimTxt(data[0].bruto || ""));
  }

  useEffect(() => {
    load();
  }, []);

  async function enviarTxt(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const bruto = await file.text();
    const lido = parseBoletimTxt(bruto);
    setParsed(lido);
    const supabase = getSupabase();
    const { error } = await supabase.from("boletim_txt").upsert({ data: hoje, bruto, parsed: lido });
    setMsg(error ? error.message : `${lido.jogos.length} jogos lidos do boletim.`);
  }

  const lista = useMemo(() => {
    const jogos = parsed.jogos || [];
    if (filtro === "principais") return jogos.filter((j) => j.principal);
    if (filtro === "todos") return jogos;
    return jogos.filter((j) => String(j.esporte || "").toLowerCase() === filtro.toLowerCase());
  }, [parsed, filtro]);

  return (
    <section>
      {admin && (
        <section className="card">
          <h2>TXT do boletim</h2>
          <p>Sobe a newsletter no formato que você já escreve.</p>
          <input ref={arquivoRef} type="file" accept=".txt,text/plain" onChange={enviarTxt} style={{ display: "none" }} />
          <p>
            <button className="green" onClick={() => arquivoRef.current?.click()}>Enviar boletim TXT</button>
          </p>
          <p>{msg}</p>
        </section>
      )}

      <section className="card">
        <h2>{textoLimpo(parsed.manchete) || "Boletim do dia"}</h2>
        {parsed.geral && <p>{textoLimpo(parsed.geral)}</p>}
        <div className="presets">
          <button className={filtro === "principais" ? "active" : ""} onClick={() => setFiltro("principais")}>
            Principais
          </button>
          <button className={filtro === "todos" ? "active" : ""} onClick={() => setFiltro("todos")}>
            Todos
          </button>
          {(parsed.esportes || []).map((esporte) => (
            <button key={esporte} className={filtro.toLowerCase() === esporte.toLowerCase() ? "active" : ""} onClick={() => setFiltro(esporte)}>
              {esporte}
            </button>
          ))}
        </div>
      </section>

      {lista.length === 0 ? (
        <section className="card">
          <p>{parsed.jogos?.length ? "Nenhum jogo neste filtro." : "O boletim de hoje ainda não foi enviado."}</p>
        </section>
      ) : (
        lista.map((jogo, index) => (
          <article className="card" key={`${jogo.jogo}-${index}`}>
            {jogo.principal && <p className="ok">Principal</p>}
            <h2>{jogo.jogo}</h2>
            <p className="muted">
              {jogo.esporte} {jogo.liga ? `· ${jogo.liga}` : ""} {jogo.hora || ""}
            </p>
            {jogo.noticia && <p>{textoLimpo(jogo.noticia)}</p>}
            {aberto === index ? (
              <>
                <p style={{ whiteSpace: "pre-wrap" }}>{textoLimpo(jogo.detalhe)}</p>
                <p><button onClick={() => setAberto(null)}>Fechar detalhe</button></p>
              </>
            ) : (
              <p><button onClick={() => setAberto(index)}>Ler detalhe</button></p>
            )}
          </article>
        ))
      )}
    </section>
  );
}
