export function rotuloStatus(status) {
  if (status === "green") return "🟢 Green";
  if (status === "red") return "🔴 Red";
  if (status === "anulada") return "⚪ Anulada";
  if (status === "cashout") return "🟡 Encerrada antecipadamente";
  return "Pendente";
}

export function rotuloSaldo(ticket, valorFormatado) {
  if (ticket.status_usuario === "green") return `🟢 Lucro ${valorFormatado}`;
  if (ticket.status_usuario === "red") return `🔴 Prejuízo ${valorFormatado}`;
  if (ticket.status_usuario === "cashout") {
    const lucro = Number(ticket.valor_resgatado || 0) - Number(ticket.valor_apostado || 0);
    return lucro >= 0 ? `🟡 Cashout · lucro ${valorFormatado}` : `🟠 Cashout · prejuízo ${valorFormatado}`;
  }
  if (ticket.status_usuario === "anulada") return "Anulada";
  return "Pendente";
}
