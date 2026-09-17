"use client";

import { nomeMercado, nomeTipo } from "../lib/mercados";
import { marcarPerna, statusDaPerna } from "../lib/resultado";
import { lucroBilhete } from "../lib/types";
import { rotuloSaldo, rotuloStatus } from "../lib/rotulos";
import { corrigirTime } from "../lib/times";

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BilheteCard({ bilhete, onChange, onConfirm, onClose, confirmarLabel = "Confirmar" }) {
  if (!bilhete) return null;
  const pernas = bilhete.pernas || bilhete.payload?.pernas || [];
  const lucro = lucroBilhete(bilhete);
  const multipla = pernas.length > 1;

  function alternar(pernaOrdem, atual) {
    if (atual !== "pendente") onChange(marcarPerna(bilhete, pernaOrdem, "pendente"));
  }

  return (
    <div className="modal" style={{ position: "relative", margin: "16px 0" }}>
      <p className="muted">
        {bilhete.casa} · {nomeTipo(bilhete.tipo, bilhete.formato)} · ID {bilhete.id_casa ?? "—"}
      </p>
      <h3>{corrigirTime(bilhete.titulo || bilhete.jogo || "Bilhete")}</h3>
      <p>
        {money(bilhete.valor_apostado)} · odd {bilhete.odd_bilhete ?? "—"} · {rotuloStatus(bilhete.status_usuario)}
      </p>
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
              <strong>{corrigirTime(perna.selecao || `Palpite ${ordem}`)}</strong>
              <p className="muted">{corrigirTime(perna.jogo || bilhete.jogo || "")}</p>
              <p>
                {nomeMercado(perna.mercado)} {perna.odd_perna ? `· ${perna.odd_perna}` : ""}
              </p>
              <p>
                {status === "pendente" ? (
                  <>
                    <button className="green" onClick={() => onChange(marcarPerna(bilhete, ordem, "green"))}>
                      🟢 Green
                    </button>{" "}
                    <button className="red" onClick={() => onChange(marcarPerna(bilhete, ordem, "red"))}>
                      🔴 Red
                    </button>
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
