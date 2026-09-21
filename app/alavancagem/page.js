"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { inicioSemana } from "../../lib/alavancagem";
import { parseAlavancagemTxt } from "../../lib/alavancagem-txt";
import { resultadoNivel } from "../../lib/alavancagem-resultado";
import { estatisticasSemana, resumoSemana } from "../../lib/alavancagem-estatisticas";
import { rotuloMercado } from "../../lib/mercado-texto";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ROTULOS = {
  segura: "Risco baixo",
  media: "Risco médio",
  alta: "Risco alto",
};
const RESULTADO_VAZIO = { segura: {}, media: {}, alta: {} };

function estadoVazio() {
  return {
    segura: { ativo: false, valor: "" },
    media: { ativo: false, valor: "" },
    alta: { ativo: false, valor: "" },
  };
}

function lerEstado(meta) {
  const base = estadoVazio();
  if (!meta) return base;
  try {
    const parsed = JSON.parse(meta.nivel || "");
    if (parsed && parsed.segura) {
      return {
        segura: { ativo: Boolean(parsed.segura.ativo), valor: parsed.segura.valor || "" },
        media: { ativo: Boolean(parsed.media?.ativo), valor: parsed.media?.valor || "" },
        alta: { ativo: Boolean(parsed.alta?.ativo), valor: parsed.alta?.valor || "" },
      };
    }
  } catch {
    /* formato antigo */
  }
  return base;
}

export default function AlavancagemPage() {
  const semana = inicioSemana();
  const arquivoRef = useRef(null);
  const [admin, setAdmin] = useState(false);
  const [parsed, setParsed] = useState(parseAlavancagemTxt(""));
  const [resultados, setResultados] = useState(RESULTADO_VAZIO);
  const [estado, setEstado] = useState(estadoVazio());
  const [aberto, setAberto] = useState(null);
  const [metaId, setMetaId] = useState(null);
  const [brutoTxt, setBrutoTxt] = useState("");
  const [msg, setMsg] = useState("");
  const [historico, setHistorico] = useState([]);

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
      setAdmin(profile?.role === "admin");
    }
    const { data: historicoRows } = await supabase.from("alavancagem_txt").select("inicio,parsed").order("inicio", { ascending: true });
    setHistorico(historicoRows || []);
    const { data: txtRows } = await supabase.from("alavancagem_txt").select("*").eq("inicio", semana).limit(1);
    if (txtRows?.[0]) {
      const lido = parseAlavancagemTxt(txtRows[0].bruto || "");
      setParsed(lido);
      setBrutoTxt(txtRows[0].bruto || "");
      setResultados(txtRows[0].parsed?.resultados || RESULTADO_VAZIO);
    }
    const { data: metas } = await supabase.from("alavancagem_metas").select("*").eq("inicio", semana).limit(1);
    if (metas?.[0]) {
      setMetaId(metas[0].id);
      setEstado(lerEstado(metas[0]));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const contas = useMemo(() => {
    const saida = {};
    for (const id of Object.keys(ROTULOS)) {
      saida[id] = resultadoNivel(parsed.niveis?.[id] || [], estado[id].valor, resultados[id] || {});
    }
    return saida;
  }, [estado, parsed, resultados]);

  const estatisticas = estatisticasSemana(parsed, resultados);
  const resumo = resumoSemana(parsed, resultados);
  const ativos = Object.keys(ROTULOS).filter((id) => estado[id].ativo);
  const investido = ativos.reduce((acc, id) => acc + Number(estado[id].valor || 0), 0);
  const banca = ativos.reduce((acc, id) => acc + contas[id].banca, 0);
  const lucro = ativos.reduce((acc, id) => acc + contas[id].lucro, 0);

  async function persistirCliente(proximo) {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return setMsg("Entre em /login");
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userData.user.id).single();
    const soma = Object.values(proximo).reduce((acc, item) => acc + (item.ativo ? Number(item.valor || 0) : 0), 0);
    const payload = {
      organization_id: profile.organization_id,
      inicio: semana,
      nivel: JSON.stringify(proximo),
      valor_investido: soma,
    };
    const { error } = metaId
      ? await supabase.from("alavancagem_metas").update(payload).eq("id", metaId)
      : await supabase.from("alavancagem_metas").insert(payload);
    setMsg(error ? error.message : "Salvo");
    if (!error) load();
  }

  async function salvarResultados(proximo) {
    const supabase = getSupabase();
    const { error } = await supabase.from("alavancagem_txt").upsert({
      inicio: semana,
      bruto: brutoTxt,
      parsed: { ...parsed, resultados: proximo },
    });
    setMsg(error ? error.message : "Resultado atualizado para todos.");
    if (!error) setResultados(proximo);
  }

  async function zerarResultados() {
    await salvarResultados(RESULTADO_VAZIO);
    setMsg("Green e Red da semana foram apagados.");
  }

  async function enviarTxt(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const bruto = await file.text();
    const lido = parseAlavancagemTxt(bruto);
    setParsed(lido);
    setBrutoTxt(bruto);
    const supabase = getSupabase();
    const { error } = await supabase.from("alavancagem_txt").upsert({
      inicio: semana,
      bruto,
      parsed: { ...lido, resultados: RESULTADO_VAZIO },
    });
    setResultados(RESULTADO_VAZIO);
    setMsg(error ? error.message : `${lido.eventos.length} jogo(s) publicados.`);
  }

  function mudarValor(id, valor) {
    setEstado((atual) => ({ ...atual, [id]: { ...atual[id], valor } }));
  }

  function iniciar(id) {
    const valor = Number(String(estado[id].valor).replace(",", "."));
    if (!valor) return setMsg("Informe o valor deste nível antes de iniciar.");
    const proximo = { ...estado, [id]: { ...estado[id], ativo: true, valor: String(valor) } };
    setEstado(proximo);
    setAberto(id);
    persistirCliente(proximo);
  }

  function verJogos(id) {
    if (!estado[id].ativo) return iniciar(id);
    setAberto((atual) => (atual === id ? null : id));
  }

  function marcar(id, index, status) {
    if (!admin) return;
    const atual = resultados[id]?.[index];
    const proximoStatus = atual === status ? "pendente" : status;
    const proximo = {
      ...resultados,
      [id]: { ...resultados[id], [index]: proximoStatus },
    };
    setResultados(proximo);
    salvarResultados(proximo);
  }

  const jogosAbertos = aberto ? contas[aberto].linhas : [];

  return (
    <section>
      {admin && (
        <section className="card">
          <h2>TXT da semana</h2>
          <input ref={arquivoRef} type="file" accept=".txt,text/plain" onChange={enviarTxt} style={{ display: "none" }} />
          <p>
            <button className="green" onClick={() => arquivoRef.current?.click()}>Enviar TXT</button>{" "}
            <button className="red" onClick={zerarResultados}>Zerar Green/Red da semana</button>
          </p>
          <p>{msg}</p>
        </section>
      )}
      {!admin && msg && <p>{msg}</p>}

      <div className="grid">
        {Object.entries(ROTULOS).map(([id, nome]) => (
          <article key={id} className="card" style={{ outline: aberto === id ? "2px solid #6ea8ff" : "none" }}>
            <h2>{nome}</h2>
            <p>Meta: {parsed.metas?.[id] || "ainda não veio no TXT"}</p>
            <p>Valor deste nível</p>
            <input value={estado[id].valor} onChange={(e) => mudarValor(id, e.target.value)} placeholder="Ex.: 100" />
            <p>{(parsed.niveis?.[id] || []).length} jogo(s)</p>
            {estado[id].ativo && (
              <p className={contas[id].lucro >= 0 ? "ok" : "bad"}>
                Banca {money(contas[id].banca)} · {contas[id].lucro >= 0 ? "Lucro" : "Prejuízo"} {money(contas[id].lucro)}
              </p>
            )}
            <p>
              {estado[id].ativo ? (
                <button className={aberto === id ? "active" : ""} onClick={() => verJogos(id)}>
                  {aberto === id ? "Esconder jogos" : "Ver jogos"}
                </button>
              ) : (
                <button onClick={() => iniciar(id)}>Iniciar este nível</button>
              )}
            </p>
          </article>
        ))}
      </div>

      {aberto && (
        <section className="card">
          <h2>Jogos · {ROTULOS[aberto]} · Meta {parsed.metas?.[aberto] || "—"}</h2>
          <p>Valor inicial: {money(estado[aberto].valor)} · Banca agora: {money(contas[aberto].banca)}</p>
          {admin && <p className="muted">Você marca o resultado. Todo cliente vê a mesma atualização.</p>}
          {jogosAbertos.length === 0 ? (
            <p>Ainda não há jogos neste nível.</p>
          ) : (
            jogosAbertos.map((jogo) => (
              <div className="leg" key={`${aberto}-${jogo.index}`}>
                <strong>{jogo.jogo}</strong>
                <p className="muted">{jogo.esporte} · {jogo.liga} · {jogo.data} {jogo.hora}</p>
                <p>{rotuloMercado(jogo.mercado, jogo.jogo)} · odd {jogo.odd} · usa {money(jogo.stake)}</p>
                {jogo.status === "green" && <p className="ok">🟢 Green · vira {money(jogo.retorno)}</p>}
                {jogo.status === "red" && <p className="bad">🔴 Red · perde {money(estado[aberto].valor)} deste nível</p>}
                {jogo.status === "fechado" && <p className="muted">Sequência encerrada</p>}
                {jogo.status === "pendente" && !admin && <p className="muted">Aguardando resultado</p>}
                {admin && jogo.status === "pendente" && (
                  <p>
                    <button className="green" onClick={() => marcar(aberto, jogo.index, "green")}>🟢 Green</button>{" "}
                    <button className="red" onClick={() => marcar(aberto, jogo.index, "red")}>🔴 Red</button>
                  </p>
                )}
                {admin && jogo.status !== "pendente" && (
                  <p>
                    <button className={jogo.status === "green" ? "green" : "red"} onClick={() => marcar(aberto, jogo.index, jogo.status)}>
                      {jogo.status === "green" ? "🟢 Green" : "🔴 Red"}
                    </button>
                  </p>
                )}
              </div>
            ))
          )}
        </section>
      )}


      <section className="card">
        <h2>Desempenho da semana</h2>
        <div className="grid">
          {Object.entries(ROTULOS).map(([id, nome]) => {
            const s = estatisticas[id];
            return (
              <article className="card" key={id}>
                <h3>{nome}</h3>
                <strong>{s.aproveitamento.toFixed(1)}% de acerto</strong>
                <p>🟢 {s.greens} Green · 🔴 {s.reds} Red · ⏳ {s.pendentes} pendente(s)</p>
                <p>Maior sequência Green: {s.maiorGreen} · Red: {s.maiorRed}</p>
                <p>{s.sequenciaAtual ? `Sequência atual: ${s.sequenciaAtual} ${s.sequenciaAtualTipo === "green" ? "Green" : "Red"}` : "Sequência atual: —"}</p>
              </article>
            );
          })}
        </div>
        <p><strong>Total:</strong> {resumo.greens} Green · {resumo.reds} Red · {resumo.pendentes} pendente(s) · {(resumo.greens + resumo.reds) ? ((resumo.greens / (resumo.greens + resumo.reds)) * 100).toFixed(1) : "0.0"}% de acerto</p>
      </section>

      <section className="card">
        <h2>Histórico das semanas</h2>
        {historico.length === 0 && <p className="muted">Ainda não há semanas registradas.</p>}
        {[...historico].reverse().map((item, reverseIndex) => {
          const index = historico.length - reverseIndex;
          const parsedSemana = item.parsed || {};
          const resultadosSemana = parsedSemana.resultados || RESULTADO_VAZIO;
          const resumoHistorico = resumoSemana(parsedSemana, resultadosSemana);
          const inicio = new Date(`${item.inicio}T12:00:00`);
          const fim = new Date(inicio);
          fim.setDate(fim.getDate() + 6);
          const formatar = (date) => date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
          const status = item.inicio === semana ? "Em andamento" : item.inicio < semana ? "Finalizada" : "Programada";
          const aproveitamento = (resumoHistorico.greens + resumoHistorico.reds) ? (resumoHistorico.greens / (resumoHistorico.greens + resumoHistorico.reds)) * 100 : 0;
          return (
            <div className="leg" key={item.inicio}>
              <strong>Semana {String(index).padStart(2, "0")} · {formatar(inicio)}–{formatar(fim)}</strong>
              <p className="muted">{status} · {resumoHistorico.total} seleções · 🟢 {resumoHistorico.greens} · 🔴 {resumoHistorico.reds} · ⏳ {resumoHistorico.pendentes}</p>
              <p><strong>{aproveitamento.toFixed(1)}% de acerto</strong></p>
            </div>
          );
        })}
      </section>
      <div className="grid">
        <article className="card">
          <h2>Investido na semana</h2
          <strong>{money(investido)}</strong>
          <p>Soma dos seus níveis</p>
        </article>
        <article className="card">
          <h2>Retorno atual</h2>
          <strong>{money(banca)}</strong>
        </article>
        <article className="card">
          <h2>Lucro / prejuízo</h2>
          <strong className={lucro >= 0 ? "ok" : "bad"}>{money(lucro)}</strong>
        </article>
      </div>
    </section>
  );
}
