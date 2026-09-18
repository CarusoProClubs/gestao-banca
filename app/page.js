"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "../lib/supabase";
import { exposicaoPendente, lucroBilhete } from "../lib/types";
import { filtrarBilhetes } from "../lib/filtros";
import { limitesSalario, orcamentoDoPeriodo, termometroFamiliar } from "../lib/periodo";
import { fecharBilhete } from "../lib/resultado";
import { rotuloSaldo, rotuloStatus } from "../lib/rotulos";
import { regrasSugeridas } from "../lib/disciplina";
import BilheteCard from "../components/BilheteCard";
import Disciplina from "../components/Disciplina";
import Icon from "../components/Icon";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function comPernas(ticket) {
  return fecharBilhete({ ...ticket, pernas: ticket.pernas || ticket.payload?.pernas || [] });
}

export default function Page() {
  const [settings, setSettings] = useState({ salario_mensal: 5000, percentual_lazer: 0.08, periodicidade: "mensal" });
  const [tickets, setTickets] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [filtros, setFiltros] = useState({ periodo: "salario", de: "", ate: "", casa: "", status: "", valorMin: "", valorMax: "", ordem: "data_desc" });

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: settingsRows } = await supabase.from("bankroll_settings").select("*").limit(1);
    if (settingsRows?.[0]) setSettings({ periodicidade: "mensal", ...settingsRows[0] });
    const { data } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });
    setTickets(data ?? []);
  }

  useEffect(() => { load(); }, []);

  const periodicidade = settings.periodicidade || "mensal";
  const faixa = limitesSalario(periodicidade);
  const lista = useMemo(() => filtrarBilhetes(tickets, { ...filtros, periodicidade }), [tickets, filtros, periodicidade]);
  const orcamento = orcamentoDoPeriodo(settings);
  const lucro = lista.reduce((acc, ticket) => acc + lucroBilhete(ticket), 0);
  const pendente = exposicaoPendente(lista);
  const termo = termometroFamiliar({ lucro, pendente, orcamento });
  const { regras, seq } = useMemo(() => regrasSugeridas(tickets, termo, orcamento), [tickets, termo, orcamento]);
  const casas = [...new Set(tickets.map((t) => t.casa).filter(Boolean))];

  async function gravar(ticket) {
    const supabase = getSupabase();
    const fechado = comPernas(ticket);
    const { error } = await supabase.rpc("atualizar_bilhete_atomico", {
      p_ticket_id: ticket.id,
      p_ticket: {
        organization_id: ticket.organization_id,
        created_by: ticket.created_by,
        casa: fechado.casa,
        id_casa: fechado.id_casa,
        codigo_booking: fechado.codigo_booking,
        data_hora: fechado.data_hora,
        tipo: fechado.tipo,
        formato: fechado.formato,
        titulo: fechado.titulo,
        valor_apostado: fechado.valor_apostado,
        moeda: fechado.moeda || "BRL",
        odd_bilhete: fechado.odd_bilhete,
        retorno_casa: fechado.retorno_casa,
        valor_resgatado: fechado.valor_resgatado,
        status_print: fechado.status_print || fechado.status_detectado || "desconhecido",
        status_usuario: fechado.status_usuario,
        esporte: fechado.esporte,
        jogo: fechado.jogo,
        payload: fechado.payload,
        lucro: fechado.lucro,
      },
      p_pernas: fechado.pernas,
    });
    if (error) {
      window.alert(`Não foi possível salvar as correções: ${error.message}`);
      return;
    }
    setAberto({ ...fechado, id: ticket.id });
    await load();
  }

  async function excluir(ticket) {
    const identificacao = ticket.titulo || ticket.casa || ticket.id_casa || "este bilhete";
    const confirmado = window.confirm(`Excluir ${identificacao}?\n\nO bilhete e todos os seus palpites serão removidos e essa ação não pode ser desfeita.`);
    if (!confirmado) return;

    const supabase = getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from("tickets").delete().eq("id", ticket.id);
    if (error) {
      window.alert(`Não foi possível excluir o bilhete: ${error.message}`);
      return;
    }
    setAberto(null);
    await load();
  }

  return (
    <section>
      <div className="presets">
        <button className={filtros.periodo === "salario" ? "active" : ""} onClick={() => setFiltros({ ...filtros, periodo: "salario" })}>{faixa.rotulo}</button>
        <button className={filtros.periodo === "semana" ? "active" : ""} onClick={() => setFiltros({ ...filtros, periodo: "semana" })}>7 dias</button>
        <button className={filtros.periodo === "mes" ? "active" : ""} onClick={() => setFiltros({ ...filtros, periodo: "mes" })}>Este mês</button>
        <button className={filtros.periodo === "semestre" ? "active" : ""} onClick={() => setFiltros({ ...filtros, periodo: "semestre" })}>1 semestre</button>
        <button className={filtros.periodo === "ano" ? "active" : ""} onClick={() => setFiltros({ ...filtros, periodo: "ano" })}>1 ano</button>
        <button className={filtros.periodo === "custom" ? "active" : ""} onClick={() => setFiltros({ ...filtros, periodo: "custom" })}>Personalizado</button>
      </div>
      {filtros.periodo === "custom" && <div className="filters"><div><p>De</p><input type="date" value={filtros.de} onChange={(e) => setFiltros({ ...filtros, de: e.target.value })} /></div><div><p>Até</p><input type="date" value={filtros.ate} onChange={(e) => setFiltros({ ...filtros, ate: e.target.value })} /></div></div>}
      <div className="grid">
        <article className="card metric-card"><div className="metric-icon"><Icon name="calendar" size={20}/></div><h2>Teto do período</h2><strong>{money(orcamento)}</strong><p>Recebimento {periodicidade}</p></article>
        <article className="card metric-card"><div className="metric-icon"><Icon name="chart" size={20}/></div><h2>Lucro / prejuízo do período</h2><strong className={lucro >= 0 ? "ok" : "bad"}>{money(lucro)}</strong></article>
        <article className="card metric-card"><div className="metric-icon"><Icon name="wallet" size={20}/></div><h2>Exposição pendente</h2><strong>{money(pendente)}</strong></article>
        <article className="card metric-card"><div className="metric-icon"><Icon name="shield" size={20}/></div><h2>Termômetro familiar</h2><strong className={termo.seguro ? "ok" : "bad"}>{termo.seguro ? "Seguro" : "Alerta"}</strong><p>Uso do caixa: {money(termo.consumo)} de {money(orcamento)}</p></article>
      </div>
      <Disciplina termo={termo} seq={seq} regras={regras} />
      <section className="card">
        <h2>Apostas do período</h2>
        <div className="filters">
          <div><p>Casa</p><select value={filtros.casa} onChange={(e) => setFiltros({ ...filtros, casa: e.target.value })}><option value="">Todas</option>{casas.map((casa) => <option key={casa} value={casa}>{casa}</option>)}</select></div>
          <div><p>Status</p><select value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value })}><option value="">Todos</option><option value="pendente">Pendente</option><option value="green">Green</option><option value="red">Red</option><option value="cashout">Cashout</option><option value="anulada">Anulada</option></select></div>
          <div><p>Valor mín.</p><input value={filtros.valorMin} onChange={(e) => setFiltros({ ...filtros, valorMin: e.target.value })} /></div>
          <div><p>Valor máx.</p><input value={filtros.valorMax} onChange={(e) => setFiltros({ ...filtros, valorMax: e.target.value })} /></div>
          <div><p>Ordenar</p><select value={filtros.ordem} onChange={(e) => setFiltros({ ...filtros, ordem: e.target.value })}><option value="data_desc">Data (mais recente)</option><option value="odd_desc">Odd maior → menor</option><option value="odd_asc">Odd menor → maior</option><option value="valor_desc">Valor maior → menor</option><option value="valor_asc">Valor menor → maior</option></select></div>
        </div>
        <table><thead><tr><th>Data</th><th>Casa</th><th>Título</th><th>Valor</th><th>Odd</th><th>Status</th><th>Resultado</th></tr></thead><tbody>
          {lista.length === 0 ? <tr><td colSpan={7}>Nenhuma aposta neste filtro.</td></tr> : lista.map((ticket) => <tr key={ticket.id} className="clickable" onClick={() => setAberto(comPernas(ticket))}>
            <td>{(ticket.data_hora || ticket.created_at || "").slice(0, 10)}</td><td>{ticket.casa ?? "—"}</td><td>{ticket.titulo ?? ticket.jogo ?? "—"}</td><td>{money(ticket.valor_apostado)}</td><td>{ticket.odd_bilhete ?? "—"}</td><td>{rotuloStatus(ticket.status_usuario)}</td><td className={ticket.status_usuario === "red" ? "bad" : ticket.status_usuario === "green" ? "ok" : ""}>{rotuloSaldo(ticket, money(Math.abs(lucroBilhete(ticket))))}</td>
          </tr>)}
        </tbody></table>
      </section>
      {aberto && <div className="overlay" onClick={() => setAberto(null)}><div onClick={(event) => event.stopPropagation()}><BilheteCard bilhete={aberto} onChange={setAberto} onConfirm={() => gravar(aberto)} onDelete={() => excluir(aberto)} onClose={() => setAberto(null)} confirmarLabel="Salvar correções" /></div></div>}
    </section>
  );
}
