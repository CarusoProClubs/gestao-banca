"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { inicioSemana } from "../../lib/alavancagem";
import { parseAlavancagemTxt } from "../../lib/alavancagem-txt";
import { filtrarBilhetes } from "../../lib/filtros";
import { lucroBilhete } from "../../lib/types";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const ROTULOS = {
  segura: { nome: "Risco baixo" },
  media: { nome: "Risco médio" },
  alta: { nome: "Risco alto" },
};

function lerNiveis(valor) {
  if (Array.isArray(valor)) return valor.filter(Boolean);
  return String(valor || "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => ROTULOS[item]);
}

export default function AlavancagemPage() {
  const semana = inicioSemana();
  const [tickets, setTickets] = useState([]);
  const [parsed, setParsed] = useState(parseAlavancagemTxt(""));
  const [niveis, setNiveis] = useState([]);
  const [valorSemana, setValorSemana] = useState("");
  const [metaId, setMetaId] = useState(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: ticketRows } = await supabase.from("tickets").select("*");
    setTickets(ticketRows ?? []);
    const { data: txtRows } = await supabase.from("alavancagem_txt").select("*").eq("inicio", semana).limit(1);
    if (txtRows?.[0]) setParsed(parseAlavancagemTxt(txtRows[0].bruto || ""));
    const { data: metas } = await supabase.from("alavancagem_metas").select("*").eq("inicio", semana).limit(1);
    if (metas?.[0]) {
      setMetaId(metas[0].id);
      setNiveis(lerNiveis(metas[0].nivel));
      setValorSemana(String(metas[0].valor_investido ?? ""));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const base = Number(String(valorSemana).replace(",", ".")) || 0;
  const daSemana = useMemo(() => filtrarBilhetes(tickets, { periodo: "semana" }), [tickets]);
  const apostado = daSemana.reduce((acc, t) => acc + Number(t.valor_apostado || 0), 0);
  const lucro = daSemana.reduce((acc, t) => acc + lucroBilhete(t), 0);
  const retorno = apostado + lucro;

  async function persistir(lista, valor = base) {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return setMsg("Entre em /login");
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userData.user.id).single();
    const payload = {
      organization_id: profile.organization_id,
      inicio: semana,
      nivel: lista.join(","),
      valor_investido: valor,
    };
    const { error } = metaId
      ? await supabase.from("alavancagem_metas").update(payload).eq("id", metaId)
      : await supabase.from("alavancagem_metas").insert(payload);
    setMsg(error ? error.message : "Salvo");
    load();
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

  function alternarNivel(id) {
    const lista = niveis.includes(id) ? niveis.filter((item) => item !== id) : [...niveis, id];
    setNiveis(lista);
    persistir(lista);
  }

  return (
    <section>
      <section className="card">
        <h2>TXT da semana</h2>
        <p>Envie o arquivo com jogos e META de cada nível.</p>
        <p>
          <input type="file" accept=".txt,text/plain" onChange={enviarTxt} />
        </p>
        <p>{msg}</p>
      </section>

      <section className="card">
        <h2>Valor inicial da semana</h2>
        <input value={valorSemana} onChange={(e) => setValorSemana(e.target.value)} placeholder="Ex.: 100" />
        <p>
          <button onClick={() => persistir(niveis, Number(String(valorSemana).replace(",", ".")) || 0)}>Salvar valor</button>
        </p>
      </section>

      <div className="grid">
        {Object.entries(ROTULOS).map(([id, info]) => (
          <article key={id} className="card" style={{ outline: niveis.includes(id) ? "2px solid #6ea8ff" : "none" }}>
            <h2>{info.nome}</h2>
            <p>Meta: {parsed.metas?.[id] || "ainda não veio no TXT"}</p>
            <p>{(parsed.niveis?.[id] || []).length} jogo(s) disponíveis</p>
            <p>
              <button className={niveis.includes(id) ? "active" : ""} onClick={() => alternarNivel(id)}>
                {niveis.includes(id) ? "Nível ativo" : "Iniciar este nível"}
              </button>
            </p>
          </article>
        ))}
      </div>

      {niveis.map((id) => (
        <section className="card" key={id}>
          <h2>Jogos · {ROTULOS[id].nome} · Meta {parsed.metas?.[id] || "—"}</h2>
          {(parsed.niveis?.[id] || []).length === 0 ? (
            <p>Ainda não há jogos neste nível.</p>
          ) : (
            (parsed.niveis?.[id] || []).map((jogo, index) => (
              <div className="leg" key={`${id}-${jogo.jogo}-${index}`}>
                <strong>{jogo.jogo}</strong>
                <p className="muted">
                  {jogo.esporte} · {jogo.liga} · {jogo.data} {jogo.hora}
                </p>
                <p>{jogo.mercado} · odd {jogo.odd || "—"}</p>
                {jogo.motivo && <p>{jogo.motivo}</p>}
              </div>
            ))
          )}
        </section>
      ))}

      <div className="grid">
        <article className="card">
          <h2>Valor inicial</h2>
          <strong>{money(base)}</strong>
        </article>
        <article className="card">
          <h2>Retorno atual</h2>
          <strong>{money(retorno)}</strong>
        </article>
        <article className="card">
          <h2>Lucro da semana</h2>
          <strong className={lucro >= 0 ? "ok" : "bad"}>{money(lucro)}</strong>
        </article>
      </div>
    </section>
  );
}
