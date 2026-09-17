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

  const destaques = parsed.jogos?.filter((j) => j.principal) || [];
  const demais = useMemo(() => {
    const jogos = parsed.jogos || [];
    if (filtro === "principais") return jogos.filter((j) => !j.principal);
    return jogos.filter((j) => String(j.esporte || "").toLowerCase() === filtro.toLowerCase() && !j.principal);
  }, [parsed, filtro]);
  const resumoDestaques = filtro === "principais"
    ? destaques
    : destaques.filter((j) => String(j.esporte || "").toLowerCase() === filtro.toLowerCase()).length
      ? destaques.filter((j) => String(j.esporte || "").toLowerCase() === filtro.toLowerCase())
      : destaques;

  return (
    <section className="jornal">
      <header className="capa">
        <p className="capa-selo">Edição · {dataBonita(hoje)}</p>
        <h1>{textoLimpo(parsed.manchete) || "A edição de hoje ainda vai ao ar"}</h1>
        {parsed.geral && <p className="capa-olho">{textoLimpo(parsed.geral)}</p>}
        <nav className="capa-abas">
          <button className={filtro === "principais" ? "active" : ""} onClick={() => { setFiltro("principais"); setAberto(null); }}>
            Principais
          </button>
          {(parsed.esportes || []).map((esporte) => (
            <button key={esporte} className={filtro.toLowerCase() === esporte.toLowerCase() ? "active" : ""} onClick={() => { setFiltro(esporte); setAberto(null); }}>
              {esporte}
            </button>
          ))}
        </nav>
        <p className="capa-admin">
          <input ref={arquivoRef} type="file" accept=".txt,text/plain" onChange={enviarTxt} style={{ display: "none" }} />
          <button className="green" onClick={() => arquivoRef.current?.click()}>Enviar boletim TXT</button>
          {msg && <span> {msg}</span>}
        </p>
      </header>

      {resumoDestaques.length > 0 && (
        <section className="resumo">
          <h2>Resumo do dia</h2>
          <ol>
            {resumoDestaques.map((jogo, index) => (
              <li key={`resumo-${index}`}>
                <strong>{jogo.jogo}</strong>
                <span>{[jogo.esporte, jogo.liga, jogo.hora].filter(Boolean).join(" · ")}</span>
                {jogo.noticia && <em>{textoLimpo(jogo.noticia)}</em>}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="caderno">
        {(filtro === "principais" ? destaques : parsed.jogos.filter((j) => String(j.esporte || "").toLowerCase() === filtro.toLowerCase())).length === 0 && (
          <p className="vazio">Nada nesta edição ainda.</p>
        )}
        {(filtro === "principais" ? [] : parsed.jogos.filter((j) => String(j.esporte || "").toLowerCase() === filtro.toLowerCase() && j.principal)).concat(demais).map((jogo, index) => (
          <article className="materia" key={`${jogo.jogo}-${index}`}>
            <p className="materia-chapéu">{[jogo.esporte, jogo.liga, jogo.hora].filter(Boolean).join("  ·  ")}</p>
            <h3>{jogo.jogo}</h3>
            {jogo.noticia && <p className="materia-linha">{textoLimpo(jogo.noticia)}</p>}
            {aberto === `${filtro}-${index}` ? (
              <>
                <div className="materia-corpo">{textoLimpo(jogo.detalhe)}</div>
                <button className="texto" onClick={() => setAberto(null)}>Fechar</button>
              </>
            ) : (
              <button className="texto" onClick={() => setAberto(`${filtro}-${index}`)}>Continuar leitura</button>
            )}
          </article>
        ))}
      </section>
    </section>
  );
}
