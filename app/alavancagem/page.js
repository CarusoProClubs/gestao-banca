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
  const [txt, setTxt] = useState("");
  const [parsed, setParsed] = useState(parseAlavancagemTxt(""));
  const [nivel, setNivel] = useState("segura");
  const [valorSemana, setValorSemana] = useState("");
  const [metaId, setMetaId] = useState(null);
  const [msg, setMsg] = useState("");

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: profile } = await supabase.from("profiles").select("role, organization_id").eq("id", userData.user.id).single();
      setAdmin(profile?.role === "admin");
    }
    const { data: ticketRows } = await supabase.from("tickets").select("*");
    setTickets(ticketRows ?? []);
    const { data: txtRows } = await supabase.from("alavancagem_txt").select("*").eq("inicio", semana).limit(1);
    if (txtRows?.[0]) {
      setTxt(txtRows[0].bruto || "");
      setParsed(parseAlavancagemTxt(txtRows[0].bruto || ""));
    }
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
  const escolhido = parsed.niveis[nivel] || {};
  const multiploAtual = base > 0 ? retorno / base : 0;

  async function enviarTxt(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const bruto = await file.text();
    const lido = parseAlavancagemTxt(bruto);
    setTxt(bruto);
    setParsed(lido);
    const supabase = getSupabase();
    const { error } = await supabase.from("alavancagem_txt").upsert({
      inicio: semana,
      bruto,
      parsed: lido,
    });
    setMsg(error ? error.message : "TXT da semana publicado.");
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
      multiplo_min: escolhido.multiploMin,
      multiplo_max: escolhido.multiploMax,
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
          <p>Sobe o arquivo com a meta de cada nível. O texto do arquivo é o que o cliente lê.</p>
          <pre className="muted">segura: Triplicar o valor da banca (3x)
media: Buscar 7x a 9x o valor investido
alta: Buscar 10x a 15x o valor da banca</pre>
          <p>
            <input type="file" accept=".txt,text/plain" onChange={enviarTxt} />
          </p>
        </section>
      )}

      <section className="card">
        <h2>Seu valor desta semana</h2>
        <p>Você define o valor em reais. A meta em X vem do TXT da semana.</p>
        <input value={valorSemana} onChange={(e) => setValorSemana(e.target.value)} placeholder="Ex.: 100" />
        <p>
          <button onClick={salvarValor}>Salvar valor</button>
        </p>
        <p>{msg}</p>
      </section>

      <div className="grid">
        {Object.keys(ROTULOS).map((id) => (
          <article key={id} className="card" style={{ outline: nivel === id ? "2px solid #6ea8ff" : "none" }}>
            <h2>{ROTULOS[id]}</h2>
            <p>{parsed.niveis[id]?.texto || "Aguardando o TXT da semana."}</p>
            <p>
              <button className={nivel === id ? "active" : ""} onClick={() => setNivel(id)}>
                Usar este nível
              </button>
            </p>
          </article>
        ))}
      </div>

      <div className="grid">
        <article className="card">
          <h2>Valor inicial</h2>
          <strong>{money(base)}</strong>
          <p>Definido por você</p>
        </article>
        <article className="card">
          <h2>Retorno atual</h2>
          <strong>{money(retorno)}</strong>
          <p>{base ? `${multiploAtual.toFixed(2)}x` : "0x"}</p>
        </article>
        <article className="card">
          <h2>Lucro da semana</h2>
          <strong className={lucro >= 0 ? "ok" : "bad"}>{money(lucro)}</strong>
          <p>Apostado: {money(apostado)}</p>
        </article>
      </div>
      {txt && (
        <section className="card">
          <h2>Texto publicado nesta semana</h2>
          <pre>{txt}</pre>
        </section>
      )}
    </section>
  );
}
