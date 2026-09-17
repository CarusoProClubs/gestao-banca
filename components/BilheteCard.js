"use client";

import { nomeMercado, nomeTipo } from "../lib/mercados";
import { marcarPerna, statusDaPerna } from "../lib/resultado";
import { lucroBilhete } from "../lib/types";
import { rotuloSaldo, rotuloStatus } from "../lib/rotulos";
import { corrigirTime } from "../lib/times";

const CASAS = ["Betano", "bet365", "Betfair", "Sportingbet", "KTO", "Novibet", "EstrelaBet", "Superbet", "Blaze", "Pixbet", "Stake", "1xBet", "Rivalo"];

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function alterarBilhete(bilhete, campo, valor) {
  const atualizado = { ...bilhete, [campo]: valor };
  return { ...atualizado, payload: { ...(atualizado.payload || {}), [campo]: valor } };
}

export default function BilheteCard({ bilhete, onChange, onConfirm, onClose, confirmarLabel = "Confirmar" }) {
  if (!bilhete) return null;
  const pernas = bilhete.pernas || bilhete.payload?.pernas || [];
  const lucro = lucroBilhete(bilhete);
  const multipla = pernas.length > 1;

  function editar(campo, valor) {
    onChange(alterarBilhete(bilhete, campo, valor));
  }

  function editarPerna(ordem, campo, valor) {
    const novasPernas = pernas.map((perna, index) =>
      (perna.ordem ?? index + 1) === ordem ? { ...perna, [campo]: valor } : perna
    );
    onChange({ ...bilhete, pernas: novasPernas, payload: { ...(bilhete.payload || {}), pernas: novasPernas } });
  }

  function alternar(pernaOrdem, atual) {
    if (atual !== "pendente") onChange(marcarPerna(bilhete, pernaOrdem, "pendente"));
  }

  return (
    <div className="modal" style={{ position: "relative", margin: "16px 0" }}>
      <p className="muted">Confira e corrija os dados lidos antes de salvar.</p>
      <div className="grid">
        <label>Casa de aposta
          <select value={bilhete.casa || ""} onChange={(e) => editar("casa", e.target.value || null)}>
            <option value="">Selecione a casa</option>
            {CASAS.map((casa) => <option key={casa} value={casa}>{casa}</option>)}
          </select>
        </label>
        <label>ID da casa
          <input value={bilhete.id_casa || ""} onChange={(e) => editar("id_casa", e.target.value || null)} />
        </label>
        <label>Valor apostado
          <input type="number" step="0.01" value={bilhete.valor_apostado ?? ""} onChange={(e) => editar("valor_apostado", e.target.value === "" ? null : Number(e.target.value))} />
        </label>
        <label>Odd do bilhete
          <input type="number" step="0.01" value={bilhete.odd_bilhete ?? ""} onChange={(e) => editar("odd_bilhete", e.target.value === "" ? null : Number(e.target.value))} />
        </label>
      </div>
      <p className="muted">{bilhete.casa ? `${bilhete.casa} · ` : "Casa não identificada · "}{nomeTipo(bilhete.tipo, bilhete.formato)} · ID {bilhete.id_casa ?? "—"}</p>
      <label>Título do bilhete
        <input value={bilhete.titulo || ""} onChange={(e) => editar("titulo", e.target.value || null)} />
      </label>
      <p>{money(bilhete.valor_apostado)} · odd {bilhete.odd_bilhete ?? "—"} · {rotuloStatus(bilhete.status_usuario)}</p>
      <p className={bilhete.status_usuario === "red" ? "bad" : bilhete.status_usuario === "green" ? "ok" : ""}>
        {rotuloSaldo(bilhete, money(Math.abs(lucro)))}
      </p>
      {multipla && <p className="muted">Um red em qualquer palpite fecha o bilhete como perdido.</p>}
      {pernas.length === 0 ? (
        <p className="muted">Sem palpite separado neste print.</p>
      ) : (
        pernas.map((perna, index) => {
          const ordem = perna.ordem ?? index + 1;
          const status = statusDaPerna(perna);
          return (
            <div className="leg" key={ordem}>
              <label>Palpite {ordem}
                <input value={perna.selecao || ""} onChange={(e) => editarPerna(ordem, "selecao", e.target.value)} />
              </label>
              <label>Jogo
                <input value={perna.jogo || ""} onChange={(e) => editarPerna(ordem, "jogo", e.target.value)} />
              </label>
              <p className="muted">{corrigirTime(perna.jogo || bilhete.jogo || "")}</p>
              <p>{nomeMercado(perna.mercado)} {perna.odd_perna ? `· ${perna.odd_perna}` : ""}</p>
              <label>Odd da perna
                <input type="number" step="0.01" value={perna.odd_perna ?? ""} onChange={(e) => editarPerna(ordem, "odd_perna", e.target.value === "" ? null : Number(e.target.value))} />
              </label>
              <p>
                {status === "pendente" ? (
                  <>
                    <button className="green" onClick={() => onChange(marcarPerna(bilhete, ordem, "green"))}>🟢 Green</button>{" "}
                    <button className="red" onClick={() => onChange(marcarPerna(bilhete, ordem, "red"))}>🔴 Red</button>
                  </>
                ) : (
                  <button className={status === "green" ? "green" : "red"} onClick={() => alternar(ordem, status)}>
                    {rotuloStatus(status)}
                  </button>
                )}
              </p>
            </div>
          );
        })
      )}
      <p>
        {onConfirm && <button className="green" onClick={onConfirm}>{confirmarLabel}</button>}{" "}
        {onClose && <button onClick={onClose}>Fechar</button>}
      </p>
    </div>
  );
}
