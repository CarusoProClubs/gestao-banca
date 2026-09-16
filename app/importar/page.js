export default function ImportarPage() {
  return (
    <section className="card">
      <h2>Importar JSON do bot</h2>
      <p>Cole o arquivo que o @LeitorBilheteBot devolveu. 1 JSON = 1 bilhete.</p>
      <textarea rows={18} placeholder='{"versao":"1.0","casa":"Betano"}' />
      <p><button>Lancar bilhete</button></p>
    </section>
  );
}
