"use client";

import { useEffect } from "react";

export default function BoletimError({ error, reset }) {
  useEffect(() => {
    console.error("Erro no segmento /boletim:", error);
  }, [error]);

  return (
    <section className="jornal">
      <div className="boletim-status erro" role="alert">
        <span>O Boletim encontrou um erro ao montar esta edição. Tente novamente.</span>
        <button className="status-retry" onClick={() => reset()}>Tentar novamente</button>
      </div>
    </section>
  );
}
