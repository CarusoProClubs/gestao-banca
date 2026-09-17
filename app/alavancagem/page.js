"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { inicioSemana } from "../../lib/alavancagem";
import { parseAlavancagemTxt } from "../../lib/alavancagem-txt";
import { resultadoNivel } from "../../lib/alavancagem-resultado";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ROTULOS = {
  segura: "Risco baixo",
  media: "Risco médio",
  alta: "Risco alto",
};

function estadoVazio() {
  return {
    segura: { ativo: false, valor: "", resultados: {} },
    media: { ativo: false, valor: "", resultados: {} },
    alta: { ativo: false, valor: "", resultados: {} },
  };
}

function lerEstado(meta) {
  const base = estadoVazio();
  if (!meta) return base;
  try {
    const parsed = JSON.parse(meta.nivel || "");
    if (parsed && parsed.segura) return { ...base, ...parsed };
  } catch {
    /* formato antigo */
  }
  return base;
}

export default function AlavancagemPage() {
  const semana = inicioSemana();
  const arquivoRef = useRef(null);
  const [parsed, setParsed] = useState(parseAlavancagemTxt(""));
  const [estado, setEstado] = useState(estadoVazio());
  const [aberto, setAberto] = useState(null);
  const [metaId, setMetaId] = useState(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: txtRows } = await supabase.from("alavancagem_txt").select("*").eq("inicio", semana).limit(1);
    if (txtRows?.[0]) setParsed(parseAlavancagemTxt(txtRows[0].bruto || ""));
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
      const item = estado[id];
      saida[id] = resultadoNivel(parsed.niveis?.[id] || [], item.valor, item.resultados);
    }
    return saida;
  }, [estado, parsed]);

  const ativos = Object.keys(ROTULOS).filter((id) => estado[id].ativo);
  const investido = ativos.reduce((acc, id) => acc + Number(estado[id].valor || 0), 0);
  const banca = ativos.reduce((acc, id) => acc + contas[id].banca, 0);
  const lucro = ativos.reduce((acc, id) => acc + contas[id].lucro, 0);

  async function persistir(proximo) {
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

  async function enviarTxt(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const bruto = await file.text();
    const lido = parseAlavancagemTxt(bruto);
    setParsed(lido);
    const supabase = getSupabase();
    const { error } = await supabase.from("alavancagem_txt").upsert({ inicio: semana, bruto, parsed: lido });
    setMsg(error ? error.message : `${lido.eventos.length} jogo(s) publicados.`);
  }

  function mudarValor(id, valor) {
    setEstado((atual) => ({ ...atual, [id]: { ...atual[id], valor } }));
  }

  function iniciar(id) {
    const valor = Number(String(estado[id].valor).replace(",", "."));
    if (!valor) return setMsg("Informe o valor deste nível antes de iniciar.");
    const proximo = {
      ...estado,
      [id]: { ...estado[id], ativo: true, valor: String(valor) },
    };
    setEstado(proximo);
    setAberto(id);
    persistir(proximo);
  }

  function verJogos(id) {
    if (!estado[id].ativo) return iniciar(id);
    setAberto((atual) => (atual === id ? null : id));
  }

  function marcar(id, index, status) {
    const atual = estado[id].resultados?.[index];
    const proximoStatus = atual === status ? "pendente" : status;
    const proximo = {
      ...estado,
      [id]: {
        ...estado[id],
        resultados: { ...estado[id].resultados, [index]: proximoStatus },
      },
    };
    setEstado(proximo);
    persistir(proximo);
  }

  const jogosAbertos = aberto ? contas[aberto].linhas : [];

  return (
    <section>
      <section className="card">
        <h2>TXT da semana</h2>
        <input ref={arquivoRef} type="file" accept=".txt,text/plain" onChange={enviarTxt} style={{ display: "none" }} />
        <p>
          <button className="green" onClick={() => arquivoRef.current?.click()}>Enviar TXT</button>
        </p>
        <p>{msg}</p>
      </section>

      <div className="grid">
        {Object.entries(ROTULOS).map(([id, nome]) => (
          <article key={id} className="card" style={{ outline: aberto === id ? "2px solid #6ea8ff" : "none" }}>
            <h2>{nome}</h2>
            <p>Meta: {parsed.metas?.[id] || "ainda não veio no TXT"}</p>
            <p>Valor deste nível</p>
            <input value={estado[id].valor} onChange={(e) => mudarValor(id, e.target.value)} placeholder="Ex.: 100" />
            <p>{(parsed.niveis?.[id] || []).length} jogo(s)</p>
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
          <p>Valor neste nível: {money(estado[aberto].valor)} · Banca agora: {money(contas[aberto].banca)}</p>
          {jogosAbertos.length === 0 ? (
            <p>Ainda não há jogos neste nível.</p>
          ) : (
            jogosAbertos.map((jogo) => (
              <div className="leg" key={`${aberto}-${jogo.index}`}>
                <strong>{jogo.jogo}</strong>
                <p className="muted">{jogo.esporte} · {jogo.liga} · {jogo.data} {jogo.hora}</p>
                <p>{jogo.mercado} · odd {jogo.odd}</p>
                {jogo.motivo && <p>{jogo.motivo}</p>}
                <p>
                  {jogo.status === "pendente" ? (
                    <>
                      <button className="green" onClick={() => marcar(aberto, jogo.index, "green")}>🟢 Green</button>{" "}
                      <button className="red" onClick={() => marcar(aberto, jogo.index, "red")}>🔴 Red</button>
                    </>
                  ) : (
                    <button className={jogo.status === "green" ? "green" : "red"} onClick={() => marcar(aberto, jogo.index, jogo.status)}>
                      {jogo.status === "green" ? "🟢 Green" : "🔴 Red"}
                    </button>
                  )}
                </p>
              </div>
            ))
          )}
        </section>
      )}

      <div className="grid">
        <article className="card">
          <h2>Investido na semana</h2>
          <strong>{money(investido)}</strong>
          <p>Soma dos níveis iniciados</p>
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
