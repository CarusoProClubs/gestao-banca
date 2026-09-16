export default function Page() {
  return (
    <section>
      <div className="grid">
        <article className="card">
          <h2>Orçamento protegido</h2>
          <strong>R$ 400,00</strong>
          <p>8% de R$ 5.000 — valor de exemplo até o Supabase ligar.</p>
        </article>
        <article className="card">
          <h2>Lucro / prejuízo</h2>
          <strong>R$ 0,00</strong>
        </article>
        <article className="card">
          <h2>Exposição pendente</h2>
          <strong>R$ 0,00</strong>
        </article>
        <article className="card">
          <h2>Termômetro</h2>
          <strong className="ok">Seguro</strong>
        </article>
      </div>
    </section>
  );
}
