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
  segura: { nome: "Risco baixo", detalhe: "3x a 5x o valor da semana" },
  media: { nome: "Risco médio", detalhe: "7x a 9x o valor da semana" },
  alta: { nome: "Risco alto", detalhe: "10x a 15x o valor da semana" },
};

export default function AlavancagemPage() {
  const semana = inicioSemana();
  const [tickets, setTickets] = useState([]);
  const [admin, setAdmin] = useState(false);
  const [parsed, setParsed] = useState(parseAlavancagemTxt(""));
  const [nivel, setNivel] = useState(null);
  const [valorSemana, setValorSemana] = useState("");
  const [metaId, setMetaId] = useState(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
      setAdmin(profile?.role === "admin");
    }
    const { data: ticketRows } = await supabase.from("tickets").select("*");
    setTickets(ticketRows ?? []);
    const { data: txtRows } = await supabase.from("alavancagem_txt").select("*").eq("inicio", semana).limit(1);
    if (txtRows?.[0]) setParsed(parseAlavancagemTxt(txtRows[0].bruto || ""));
    const { data: metas } = await supabase.from("alavancagem_metas").select("*").eq("inicio", semana).limit(1);
    if (metas?.[0]) {
      setMetaId(metas[0].id);
      setNivel(metas[0].nivel || null);
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
  const jogos = nivel ? parsed.niveis?.[nivel] || [] : [];

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

  async function iniciarNivel(id) {
    setNivel(id);
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return setMsg("Entre em /login");
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userData.user.id).single();
    const payload = {
      organization_id: profile.organization_id,
      inicio: semana,
      nivel: id,
      valor_investido: base,
    };
    const { error } = metaId
      ? await supabase.from("alavancagem_metas").update(payload).eq("id", metaId)
      : await supabase.from("alavancagem_metas").insert(payload);
    setMsg(error ? error.message : `Nível ${ROTULOS[id].nome} iniciado.`);
    load();
  }

  async function salvarValor() {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return setMsg("Entre em /login");
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userData.user.id).single();
    const payload = {
      organization_id: profile.organization_id,
      inicio: semana,
      nivel: nivel || "segura",
      valor_investido: base,
    };
    const { error } = metaId
      ? await supabase.from("alavancagem_metas").update(payload).eq("id", metaId)
      : await supabase.from("alavancagem_metas").insert(payload);
    setMsg(error ? error.message : "Valor da semana salvo.");
    load();
  }

  return (
    <section>
      {admin && (
        <section className="card">
          <h2>TXT da semana</h2>
          <p>Sobe os jogos separados por nível. O cliente só vê os jogos do nível que iniciar.</p>
          <input type="file" accept=".txt,text/plain" onChange={enviarTxt} />
        </section>
      )}

      <section className="card">
        <h2>Valor inicial da semana</h2>
        <input value={valorSemana} onChange={(e) => setValorSemana(e.target.value)} placeholder="Ex.: 100" />
        <p>
          <button onClick={salvarValor}>Salvar valor</button>
        </p>
        <p>{msg}</p>
      </section>

      <div className="grid">
        {Object.entries(ROTULOS).map(([id, info]) => (
          <article key={id} className="card" style={{ outline: nivel === id ? "2px solid #6ea8ff" : "none" }}>
            <h2>{info.nome}</h2>
            <p>{info.detalhe}</p>
            <p>{(parsed.niveis?.[id] || []).length} jogo(s) disponíveis</p>
            <p>
              <button className={nivel === id ? "active" : ""} onClick={() => iniciarNivel(id)}>
                {nivel === id ? "Nível em andamento" : "Iniciar este nível"}
              </button>
            </p>
          </article>
        ))}
      </div>

      {nivel && (
        <section className="card">
          <h2>Jogos para concluir a alavancagem · {ROTULOS[nivel].nome}</h2>
          <p>Só entram as possibilidades que você marcou neste nível no TXT.</p>
          {jogos.length === 0 ? (
            <p>Ainda não há jogos neste nível.</p>
          ) : (
            jogos.map((jogo, index) => (
              <div className="leg" key={`${jogo.jogo}-${index}`}>
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
      )}

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
