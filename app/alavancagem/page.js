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

const ROTULOS = { segura: "Risco baixo", media: "Risco médio", alta: "Risco alto" };

export default function AlavancagemPage() {
  const semana = inicioSemana();
  const [tickets, setTickets] = useState([]);
  const [admin, setAdmin] = useState(false);
  const [parsed, setParsed] = useState(parseAlavancagemTxt(""));
  const [nivel, setNivel] = useState("segura");
  const [aberto, setAberto] = useState(null);
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
      setNivel(metas[0].nivel || "segura");
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
  const eventos = parsed.niveis?.[nivel] || [];

  async function enviarTxt(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const bruto = await file.text();
    const lido = parseAlavancagemTxt(bruto);
    setParsed(lido);
    const supabase = getSupabase();
    const { error } = await supabase.from("alavancagem_txt").upsert({ inicio: semana, bruto, parsed: lido });
    setMsg(error ? error.message : `${lido.eventos.length} evento(s) publicados.`);
  }

  async function salvarValor() {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return setMsg("Entre em /login");
    const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userData.user.id).single();
    const payload = {
      organization_id: profile.organization_id,
      inicio: semana,
      nivel,
      valor_investido: base,
      multiplo_min: null,
      multiplo_max: null,
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
          <p>Arquivo com os jogos separados por nível. O cliente escolhe o evento.</p>
          <input type="file" accept=".txt,text/plain" onChange={enviarTxt} />
        </section>
      )}

      <section className="card">
        <h2>Seu valor desta semana</h2>
        <input value={valorSemana} onChange={(e) => setValorSemana(e.target.value)} placeholder="Ex.: 100" />
        <p>
          <button onClick={salvarValor}>Salvar valor</button>
        </p>
        <p>{msg}</p>
      </section>

      <div className="presets">
        {Object.entries(ROTULOS).map(([id, nome]) => (
          <button key={id} className={nivel === id ? "active" : ""} onClick={() => { setNivel(id); setAberto(null); }}>
            {nome} ({(parsed.niveis?.[id] || []).length})
          </button>
        ))}
      </div>

      <section className="card">
        <h2>Eventos · {ROTULOS[nivel]}</h2>
        {eventos.length === 0 ? (
          <p>Nenhum evento neste nível para a semana.</p>
        ) : (
          eventos.map((evento, index) => (
            <div className="leg" key={`${evento.jogo}-${index}`} onClick={() => setAberto(evento)} style={{ cursor: "pointer" }}>
              <strong>{evento.jogo || evento.titulo || "Evento"}</strong>
              <p className="muted">
                {evento.esporte} {evento.liga ? `· ${evento.liga}` : ""} {evento.data ? `· ${evento.data}` : ""} {evento.hora || ""}
              </p>
              <p>{evento.mercado} {evento.odd ? `· odd ${evento.odd}` : ""}</p>
            </div>
          ))
        )}
      </section>

      {aberto && (
        <div className="overlay" onClick={() => setAberto(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <p className="muted">{aberto.esporte} · {aberto.liga} · {ROTULOS[aberto.nivel]}</p>
            <h3>{aberto.jogo}</h3>
            <p>{aberto.data} {aberto.hora}</p>
            <p>Mercado: {aberto.mercado}</p>
            <p>Odd base: {aberto.odd || "—"}</p>
            <p>{aberto.motivo}</p>
            <p>Seu valor da semana: {money(base)}</p>
            <p>
              <button onClick={() => setAberto(null)}>Fechar</button>
            </p>
          </div>
        </div>
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
