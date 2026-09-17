"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { parseBoletimTxt } from "../../lib/boletim-txt";
import { textoLimpo } from "../../lib/texto-limpo";
import "./boletim.css";

function dataBonita(iso) {
  const [ano, mes, dia] = String(iso).split("-");
  return `${dia}/${mes}/${ano}`;
}

export default function BoletimPage() {
  const hoje = new Date().toISOString().slice(0, 10);
  const arquivoRef = useRef(null);
  const [parsed, setParsed] = useState(parseBoletimTxt(""));
  const [filtro, setFiltro] = useState("principais");
  const [aberto, setAberto] = useState(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data } = await supabase.from("boletim_txt").select("*").eq("data", hoje).limit(1);
    if (data?.[0]) setParsed(parseBoletimTxt(data[0].bruto || ""));
  }

  useEffect(() => {
    document.body.classList.add("pagina-boletim");
    load();
    return () => document.body.classList.remove("pagina-boletim");
  }, []);

  async function enviarTxt(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const bruto = await file.text();
    const lido = parseBoletimTxt(bruto);
    setParsed(lido);
    const supabase = getSupabase();
    const { error } = await supabase.from("boletim_txt").upsert({ data: hoje, bruto, parsed: lido });
    setMsg(error ? error.message : `${lido.jogos.length} jogos no ar.`);
  }

  const lista = useMemo(() => {
    const jogos = parsed.jogos || [];
    if (filtro === "principais") return jogos.filter((j) => j.principal);
    if (filtro === "todos") return jogos;
    return jogos.filter((j) => String(j.esporte || "").toLowerCase() === filtro.toLowerCase());
  }, [parsed, filtro]);

  return (
    <section className="folha">
      <header className="edicao">
        <p className="edicao-kicker">Boletim · {dataBonita(hoje)}</p>
        <h1>{textoLimpo(parsed.manchete) || "A edição de hoje ainda vai ao ar"}</h1>
        {parsed.geral && <p className="edicao-lead">{textoLimpo(parsed.geral)}</p>}
        <div className="edicao-filtros">
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
        <div className="edicao-admin">
          <input ref={arquivoRef} type="file" accept=".txt,text/plain" onChange={enviarTxt} style={{ display: "none" }} />
          <button className="green" onClick={() => arquivoRef.current?.click()}>Enviar boletim TXT</button>
          {msg && <span>{msg}</span>}
        </div>
      </header>

      {lista.length === 0 ? (
        <article className="materia">
          <p>{parsed.jogos?.length ? "Nada neste recorte." : "Quando o TXT do dia subir, a edição aparece aqui."}</p>
        </article>
      ) : (
        <div className="grade-boletim">
          {lista.map((jogo, index) => (
            <article className={jogo.principal && index === 0 && filtro === "principais" ? "materia destaque" : "materia"} key={`${jogo.jogo}-${index}`}>
              <div className="materia-meta">
                {jogo.principal && <span className="pill">Destaque</span>}
                <span>{jogo.esporte}</span>
                {jogo.liga && <span>{jogo.liga}</span>}
                {jogo.hora && <span>{jogo.hora}</span>}
              </div>
              <h2>{jogo.jogo}</h2>
              {jogo.noticia && <p className="materia-linha">{textoLimpo(jogo.noticia)}</p>}
              {aberto === index ? (
                <>
                  <div className="materia-corpo">{textoLimpo(jogo.detalhe)}</div>
                  <button onClick={() => setAberto(null)}>Fechar</button>
                </>
              ) : (
                <button onClick={() => setAberto(index)}>Ler a matéria</button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
