"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { parseBoletimTxt } from "../../lib/boletim-txt";
import { textoLimpo } from "../../lib/texto-limpo";
import { chamadaJornal } from "../../lib/chamada-jornal";
import "./boletim.css";

function dataBonita(iso) {
  const [ano, mes, dia] = String(iso).split("-");
  return `${dia}/${mes}/${ano}`;
}

function trecho(texto) {
  const limpo = textoLimpo(texto || "").replace(/\n{2,}/g, "\n").trim();
  if (!limpo) return "";
  const partes = limpo.split(/\n/).filter(Boolean);
  const bloco = partes.slice(0, 4).join("\n");
  if (bloco.length <= 520) return bloco;
  const corte = bloco.slice(0, 520);
  const ponto = Math.max(corte.lastIndexOf(". "), corte.lastIndexOf(".\n"));
  return `${ponto > 220 ? corte.slice(0, ponto + 1) : corte}…`;
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
  const resumoDestaques = filtro === "principais"
    ? destaques
    : destaques.filter((j) => String(j.esporte || "").toLowerCase() === filtro.toLowerCase()).length
      ? destaques.filter((j) => String(j.esporte || "").toLowerCase() === filtro.toLowerCase())
      : destaques;
  const materias = useMemo(() => {
    const jogos = parsed.jogos || [];
    if (filtro === "principais") return jogos;
    return jogos.filter((j) => String(j.esporte || "").toLowerCase() === filtro.toLowerCase());
  }, [parsed, filtro]);

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
          <p className="chamada">{chamadaJornal(resumoDestaques)}</p>
        </section>
      )}

      <section className="caderno">
        {materias.length === 0 && <p className="vazio">Nada nesta edição ainda.</p>}
        {materias.map((jogo, index) => {
          const preview = trecho(jogo.detalhe || jogo.noticia);
          const abertoAgora = aberto === `${filtro}-${index}`;
          return (
            <article className="materia" key={`${jogo.jogo}-${index}`}>
              <p className="materia-chapéu">{[jogo.esporte, jogo.liga, jogo.hora].filter(Boolean).join("  ·  ")}</p>
              <h3>{jogo.jogo}</h3>
              {abertoAgora ? (
                <div className="materia-corpo">{textoLimpo(jogo.detalhe || jogo.noticia)}</div>
              ) : (
                preview && <p className="materia-linha">{preview}</p>
              )}
              {(jogo.detalhe || jogo.noticia) && (
                <button className="texto" onClick={() => setAberto(abertoAgora ? null : `${filtro}-${index}`)}>
                  {abertoAgora ? "Fechar" : "Continuar leitura"}
                </button>
              )}
            </article>
          );
        })}
      </section>
    </section>
  );
}
