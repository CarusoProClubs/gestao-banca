export function rotuloStatus(status) {
  if (status === "green") return "🟢 Green";
  if (status === "red") return "🔴 Red";
  if (status === "anulada") return "⚪ Anulada";
  return "Pendente";
}

export function rotuloSaldo(ticket, valorFormatado) {
  if (ticket.status_usuario === "green") return `🟢 Lucro ${valorFormatado}`;
  if (ticket.status_usuario === "red") return `🔴 Prejuízo ${valorFormatado}`;
  if (ticket.status_usuario === "anulada") return "Anulada";
  return "Pendente";
}
