export default function BilhetesPage() {
  return (
    <section className="card">
      <h2>Bilhetes</h2>
      <p>Cada linha é um JSON do bot. Green e Red são botão seu, não API.</p>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Título</th>
            <th>Valor</th>
            <th>Odd</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5}>Nenhum bilhete ainda. Importe o JSON do Telegram.</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
