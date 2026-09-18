"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { parseBoletimTxt } from "../../lib/boletim-txt";
import { chamadaBancada, entradasComValor, nomeProprio, vozDetalhe, vozMateria, vozTexto } from "../../lib/voz-esportiva";
import "./boletim.css";

function dataLocal() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function dataBonita(iso) {
  const [ano, mes, dia] = String(iso).split("-");
  return `${dia}/${mes}/${ano}`;
}

function mensagemErro(error, fallback) {
  if (!error) return fallback;
  return [error.message, error.hint, error.details].filter(Boolean).join(" · ") || fallback;
}

export default function BoletimPage() {
  const hoje = dataLocal();
  const arquivoRef = useRef(null);
  const [parsed, setParsed] = useState(parseBoletimTxt(""));
  const [filtro, setFiltro] = useState("principais");
  const [aberto, setAberto] = useState(null);
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState("carregando");

  async function load() {
    try {
      const supabase = getSupabase();

      if (!supabase) {
        setStatus("erro");
        setMsg("O Supabase não está configurado neste ambiente.");
        return;
      }

      const { data: usuario, error: authError } = await supabase.auth.getUser();

      if (authError) {
        setStatus("erro");
        setMsg(mensagemErro(authError, "Não foi possível validar seu acesso."));
        return;
      }

      if (!usuario?.user) {
        setStatus("login");
        setMsg("Entre no seu perfil para carregar o boletim.");
        return;
      }

      const { data, error } = await supabase
        .from("boletim_txt")
        .select("data, bruto, parsed")
        .eq("data", hoje)
        .limit(1);

      if (error) {
        setStatus("erro");
        setMsg(mensagemErro(error, "Não foi possível carregar o boletim de hoje."));
        return;
      }

      if (!data?.[0]) {
        setStatus("vazio");
        setMsg("Ainda não existe um boletim publicado para hoje.");
        return;
      }

      const registro = data[0];
      const lido = registro.bruto
        ? parseBoletimTxt(registro.bruto)
        : registro.parsed || parseBoletimTxt("");

      setParsed(lido);
      setStatus(lido.jogos?.length ? "ok" : "vazio");
      setMsg(lido.jogos?.length ? `${lido.jogos.length} jogos no ar.` : "O boletim existe, mas ainda não trouxe jogos.");
    } catch (error) {
      console.error("Erro ao carregar boletim:", error);
      setStatus("erro");
      setMsg(mensagemErro(error, "Falha inesperada ao carregar o boletim."));
    }
  }

  useEffect(() => {
    document.body.classList.add("pagina-boletim");
    load();
    return () => document.body.classList.remove("pagina-boletim");
  }, []);

  async function enviarTxt(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = "";
    setStatus("salvando");
    setMsg("Lendo e salvando o boletim...");

    try {
      const bruto = await file.text();
      const lido = parseBoletimTxt(bruto);

      if (!lido.jogos?.length) {
        setStatus("erro");
        setMsg("O TXT foi lido, mas nenhum jogo foi reconhecido. Confira o formato.");
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        setStatus("erro");
        setMsg("O Supabase não está configurado neste ambiente.");
        return;
      }

      const { data: usuario, error: authError } = await supabase.auth.getUser();
      if (authError || !usuario?.user) {
        setStatus("login");
        setMsg("Faça login para publicar um boletim.");
        return;
      }

      const { error } = await supabase
        .from("boletim_txt")
        .upsert(
          { data: hoje, bruto, parsed: lido },
          { onConflict: "data" }
        );

      if (error) {
        setStatus("erro");
        setMsg(mensagemErro(error, "Não foi possível salvar o boletim. Se você não for administrador, peça acesso."));
        return;
      }

      setParsed(lido);
      setFiltro("principais");
      setAberto(null);
      setStatus("ok");
      setMsg(`${lido.jogos.length} jogos no ar. TXT e leitura estruturada foram salvos.`);
    } catch (error) {
      console.error("Erro ao publicar boletim:", error);
      setStatus("erro");
      setMsg(mensagemErro(error, "Falha inesperada ao publicar o boletim."));
    }
  }

  const destaques = parsed.jogos?.filter((j) => j.principal) || [];
  const resumoDestaques = filtro === "principais"
    ? destaques
    : destaques.filter((j) => String(j.esporte || "").toLowerCase() === filtro.toLowerCase()).length
      ? destaques.filter((j) => String(j.esporte || "").toLowerCase() === filtro.toLowerCase())
      : destaques;

  const materias = useMemo(() => {
    const jogos = parsed.jogos || [];
    if (filtro === "principais") return jogos.filter((j) => j.principal);
    return jogos.filter((j) => String(j.esporte || "").toLowerCase() === filtro.toLowerCase());
  }, [parsed, filtro]);

  const vazioTexto = status === "login"
    ? "Faça login para acessar a edição de hoje."
    : status === "erro"
      ? "O boletim não conseguiu ser carregado. Veja o aviso acima."
      : status === "carregando"
        ? "Carregando a edição de hoje..."
        : "A redação ainda não fechou esta parte da edição.";

  return (
    <section className="jornal">
      <header className="capa">
        <p className="capa-selo">Edição · {dataBonita(hoje)}</p>
        <h1>{parsed.manchete ? nomeProprio(parsed.manchete) : "Boletim do Dia"}</h1>
        {parsed.geral && <p className="capa-olho">{vozTexto(parsed.geral)}</p>}

        <nav className="capa-abas" aria-label="Esportes da edição">
          <button className={filtro === "principais" ? "active" : ""} onClick={() => { setFiltro("principais"); setAberto(null); }}>
            Principais
          </button>
          {(parsed.esportes || []).map((esporte) => (
            <button key={esporte} className={filtro.toLowerCase() === esporte.toLowerCase() ? "active" : ""} onClick={() => { setFiltro(esporte); setAberto(null); }}>
              {esporte}
            </button>
          ))}
        </nav>

        <div className={`boletim-status ${status}`} aria-live="polite">
          <span>{msg || "Preparando a edição..."}</span>
          {status === "erro" || status === "login" ? (
            <button className="status-retry" onClick={load}>Tentar novamente</button>
          ) : null}
        </div>

        <p className="capa-admin">
          <input ref={arquivoRef} type="file" accept=".txt,text/plain" onChange={enviarTxt} style={{ display: "none" }} />
          <button className="green" onClick={() => arquivoRef.current?.click()} disabled={status === "salvando"}>
            {status === "salvando" ? "Publicando..." : "Enviar boletim TXT"}
          </button>
        </p>
      </header>

      {resumoDestaques.length > 0 && (
        <section className="resumo">
          <p className="chamada">{chamadaBancada(resumoDestaques)}</p>
        </section>
      )}

      <section className="caderno">
        {materias.length === 0 && <p className="vazio">{vazioTexto}</p>}

        {materias.map((jogo, index) => {
          const abertoAgora = aberto === `${filtro}-${index}`;
          const destaque = filtro === "principais" && index === 0;
          return (
            <article className={`materia${destaque ? " destaque" : ""}`} key={`${jogo.jogo}-${index}`}>
              <p className="materia-chapéu">
                {[jogo.esporte, jogo.liga, jogo.hora].filter(Boolean).join("  ·  ")}
              </p>
              <h3>{nomeProprio(jogo.jogo)}</h3>

              {abertoAgora ? (
                <div className="materia-corpo">{vozDetalhe(jogo)}</div>
              ) : (
                <p className="materia-linha">{vozMateria(jogo)}</p>
              )}

              {entradasComValor(jogo).length > 0 && (
                <div className="entradas-valor" aria-label="Entradas com valor potencial">
                  {entradasComValor(jogo).map((entrada, i) => (
                    <div className={`entrada-valor ${entrada.valor.forte ? "forte" : "moderada"}`} key={`${entrada.mercado}-${i}`}>
                      <span className="entrada-selo">VALOR POTENCIAL</span>
                      <strong>{entrada.mercado || "Entrada no radar"}</strong>
                      <span className="entrada-dados">Odd {entrada.odd.toFixed(2)} · estimativa {entrada.probabilidade}% · margem +{entrada.valor.valor.toFixed(1)} p.p.</span>
                    </div>
                  ))}
                </div>
              )}

              {(jogo.detalhe || jogo.noticia || jogo.resumo || jogo.leitura || entradasComValor(jogo).length > 0) && (
                <button className="texto" onClick={() => setAberto(abertoAgora ? null : `${filtro}-${index}`)}>
                  {abertoAgora ? "Fechar leitura" : "Continuar leitura"}
                </button>
              )}
            </article>
          );
        })}
      </section>
    </section>
  );
}
