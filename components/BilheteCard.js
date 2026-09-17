"use client";

import { nomeMercado, nomeTipo } from "../lib/mercados";
import { marcarPerna, statusDaPerna } from "../lib/resultado";
import { lucroBilhete } from "../lib/types";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BilheteCard({ bilhete, onChange, onConfirm, onClose, confirmarLabel = "Confirmar" }) {
  if (!bilhete) return null;
  const pernas = bilhete.pernas || bilhete.payload?.pernas || [];
  const lucro = lucroBilhete(bilhete);
  const multipla = pernas.length > 1;

  return (
    <div className="modal" style={{ position: "relative", margin: "16px 0" }}>
      <p className="muted">
        {bilhete.casa} · {nomeTipo(bilhete.tipo, bilhete.formato)} · ID {bilhete.id_casa ?? "—"}
      </p>
      <h3>{bilhete.titulo || bilhete.jogo || "Bilhete"}</h3>
      <p>
        {money(bilhete.valor_apostado)} · odd {bilhete.odd_bilhete ?? "—"} · {bilhete.status_usuario}
      </p>
      <p className={lucro >= 0 ? "ok" : "bad"}>
        {bilhete.status_usuario === "pendente" ? "Saldo ainda pendente" : lucro >= 0 ? `Lucro ${money(lucro)}` : `Prejuízo ${money(lucro)}`}
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
              <strong>{perna.selecao || `Palpite ${ordem}`}</strong>
              <p className="muted">{perna.jogo || bilhete.jogo || ""}</p>
              <p>
                {nomeMercado(perna.mercado)} {perna.odd_perna ? `· ${perna.odd_perna}` : ""}
              </p>
              <p>
                <button className={status === "green" ? "green active" : "green"} onClick={() => onChange(marcarPerna(bilhete, ordem, "green"))}>
                  Green
                </button>{" "}
                <button className={status === "red" ? "red active" : "red"} onClick={() => onChange(marcarPerna(bilhete, ordem, "red"))}>
                  Red
                </button>
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
