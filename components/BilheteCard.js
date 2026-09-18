"use client";
import { nomeMercado, nomeTipo } from "../lib/mercados";
import { marcarPerna, statusDaPerna, fecharBilhete } from "../lib/resultado";
import { lucroBilhete } from "../lib/types";
import { rotuloSaldo, rotuloStatus } from "../lib/rotulos";

const CASAS = ["Betano", "bet365", "Betfair", "Sportingbet", "KTO", "Novibet", "EstrelaBet", "Superbet", "Blaze", "Pixbet", "Stake", "1xBet", "Rivalo"];

function money(value) { return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function paraDatetimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function deDatetimeLocal(value) {
  if (!value) return null;
  // O input representa horário local do usuário. Não usamos toISOString(),
  // pois isso deslocaria o horário para UTC e poderia alterar a data exibida.
  const [date, time] = value.split("T");
  if (!date || !time) return null;
  return `${date}T${time}:00`;
}
function alterarBilhete(bilhete, campo, valor) {
  const atualizado = { ...bilhete, [campo]: valor };
  return fecharBilhete({ ...atualizado, payload: { ...(atualizado.payload || {}), [campo]: valor } });
}

export default function BilheteCard({ bilhete, onChange, onConfirm, onDelete, onClose, confirmarLabel = "Confirmar" }) {
  if (!bilhete) return null;
  const pernas = bilhete.pernas || bilhete.payload?.pernas || [];
  const lucro = lucroBilhete(bilhete);
  const multipla = pernas.length > 1;
  function editar(campo, valor) { onChange(alterarBilhete(bilhete, campo, valor)); }
  function editarPerna(ordem, campo, valor) {
    const novasPernas = pernas.map((perna, index) => (perna.ordem ?? index + 1) === ordem ? { ...perna, [campo]: valor } : perna);
    onChange(fecharBilhete({ ...bilhete, pernas: novasPernas, payload: { ...(bilhete.payload || {}), pernas: novasPernas } }));
  }
  function definirResultado(status) { onChange(fecharBilhete({ ...bilhete, status_usuario: status })); }
  function alternar(pernaOrdem, atual) { if (atual !== "pendente") onChange(marcarPerna(bilhete, pernaOrdem, "pendente")); }
  return (
    <div className="modal" style={{ position: "relative", margin: "16px 0" }}>
      <p className="muted">Confira e corrija os dados lidos antes de salvar. A IA nunca fecha o resultado financeiro sozinha.</p>
      {bilhete.avisos?.length > 0 && <div className="card" style={{ marginBottom: 12 }}><strong>⚠️ Pontos para conferir</strong><ul>{bilhete.avisos.map((aviso, index) => <li key={index}>{aviso}</li>)}</ul></div>}
      <div className="grid">
        <label>Casa de aposta<select value={bilhete.casa || ""} onChange={(e) => editar("casa", e.target.value || null)}><option value="">Selecione a casa</option>{CASAS.map((casa) => <option key={casa} value={casa}>{casa}</option>)}</select></label>
        <label>Data e hora<input type="datetime-local" value={paraDatetimeLocal(bilhete.data_hora)} onChange={(e) => editar("data_hora", deDatetimeLocal(e.target.value))} /></label>
        <label>ID da casa<input value={bilhete.id_casa || ""} onChange={(e) => editar("id_casa", e.target.value || null)} /></label>
        <label>Valor apostado<input type="number" min="0.01" step="0.01" value={bilhete.valor_apostado ?? ""} onChange={(e) => editar("valor_apostado", e.target.value === "" ? null : Number(e.target.value))} /></label>
        <label>Odd do bilhete<input type="number" min="0.000001" step="0.000001" value={bilhete.odd_bilhete ?? ""} onChange={(e) => editar("odd_bilhete", e.target.value === "" ? null : Number(e.target.value))} /></label>
        <label>Retorno exibido<input type="number" min="0" step="0.01" value={bilhete.retorno_casa ?? ""} onChange={(e) => editar("retorno_casa", e.target.value === "" ? null : Number(e.target.value))} /></label>
      </div>
      <p className="muted">{bilhete.casa ? bilhete.casa + " · " : "Casa não identificada · "}{nomeTipo(bilhete.tipo, bilhete.formato)} · ID {bilhete.id_casa ?? "—"}</p>
      <label>Título do bilhete<input value={bilhete.titulo || ""} onChange={(e) => editar("titulo", e.target.value || null)} /></label>
      <label>Resultado confirmado por você<select value={bilhete.status_usuario || "pendente"} onChange={(e) => definirResultado(e.target.value)}><option value="pendente">Pendente</option><option value="green">🟢 Green</option><option value="red">🔴 Red</option><option value="anulada">⚪ Anulada</option><option value="cashout">🟡 Encerrada antecipadamente</option></select></label>
      {bilhete.status_usuario === "cashout" && <label>Valor resgatado no cashout<input type="number" min="0" step="0.01" value={bilhete.valor_resgatado ?? ""} onChange={(e) => editar("valor_resgatado", e.target.value === "" ? null : Number(e.target.value))} placeholder="Ex.: 73,50" /></label>}
      <p>{money(bilhete.valor_apostado)} · odd {bilhete.odd_bilhete ?? "—"} · {rotuloStatus(bilhete.status_usuario)}</p>
      <p className={lucro < 0 ? "bad" : lucro > 0 ? "ok" : ""}>{rotuloSaldo(bilhete, money(Math.abs(lucro)))}</p>
      {multipla && <p className="muted">Um red em qualquer palpite fecha o bilhete como perdido, exceto quando você define manualmente cashout ou anulada.</p>}
      {pernas.length === 0 ? <p className="muted">Sem palpite separado neste print.</p> : pernas.map((perna, index) => {
        const ordem = perna.ordem ?? index + 1; const status = statusDaPerna(perna);
        return <div className="leg" key={ordem}>
          <label>Palpite {ordem}<input value={perna.selecao || ""} onChange={(e) => editarPerna(ordem, "selecao", e.target.value)} /></label>
          <label>Jogo<input value={perna.jogo || ""} onChange={(e) => editarPerna(ordem, "jogo", e.target.value)} /></label>
          <p>{nomeMercado(perna.mercado)} {perna.odd_perna ? "· " + perna.odd_perna : ""}</p>
          <label>Mercado<input value={perna.mercado || ""} onChange={(e) => editarPerna(ordem, "mercado", e.target.value || null)} /></label>
          <label>Odd da perna<input type="number" min="0.000001" step="0.000001" value={perna.odd_perna ?? ""} onChange={(e) => editarPerna(ordem, "odd_perna", e.target.value === "" ? null : Number(e.target.value))} /></label>
          <p>{status === "pendente" ? <><button className="green" onClick={() => onChange(marcarPerna(bilhete, ordem, "green"))}>🟢 Green</button>{" "}<button className="red" onClick={() => onChange(marcarPerna(bilhete, ordem, "red"))}>🔴 Red</button></> : <button className={status === "green" ? "green" : status === "red" ? "red" : ""} onClick={() => alternar(ordem, status)}>{rotuloStatus(status)}</button>}</p>
        </div>;
      })}
      <p>{onConfirm && <button className="green" onClick={onConfirm}>{confirmarLabel}</button>}{" "}{onClose && <button onClick={onClose}>Fechar</button>}</p>
      {onDelete && <p><button className="red" onClick={onDelete}>🗑️ Excluir bilhete</button></p>}
    </div>
  );
}
