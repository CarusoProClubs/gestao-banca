export default function ConfigPage() {
  return (
    <section className="card">
      <h2>Configuração da banca</h2>
      <p>Salário mensal</p>
      <input defaultValue="5000" />
      <p>% lazer / apostas</p>
      <input defaultValue="0.08" />
      <p>Stake padrão</p>
      <input defaultValue="0.02" />
      <p><button>Salvar</button></p>
    </section>
  );
}
