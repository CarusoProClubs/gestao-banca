export function rotuloSaldo(ticket, valorFormatado) {
  if (ticket.status_usuario === "green") return `Lucro ${valorFormatado}`;
  if (ticket.status_usuario === "red") return `Prejuízo ${valorFormatado}`;
  if (ticket.status_usuario === "anulada") return "Anulada";
  return "Pendente";
}
