"use client";

import { rotuloStatus } from "../lib/rotulos";

export default function Disciplina({ termo, seq, regras }) {
  return (
    <section className="card">
      <h2>Disciplina</h2>
      <p>
        {termo.seguro ? "🟢 Caixa familiar seguro" : "🔴 Alerta de teto"}
        {seq.tamanho > 0 ? ` · sequência: ${seq.tamanho} ${rotuloStatus(seq.tipo)}` : ""}
      </p>
      <ul>
        {regras.map((regra) => (
          <li key={regra}>{regra}</li>
        ))}
      </ul>
    </section>
  );
}
