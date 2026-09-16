/** @typedef {'pendente' | 'green' | 'red' | 'anulada'} StatusUsuario */

export const emptySettings = {
  salario_mensal: 5000,
  percentual_lazer: 0.08,
  meta_lucro: 0.2,
  stake_padrao: 0.02,
};

export function orcamentoProtegido(settings) {
  return Number(settings.salario_mensal) * Number(settings.percentual_lazer);
}

export function lucroBilhete(ticket) {
  const valor = Number(ticket.valor_apostado || 0);
  const odd = Number(ticket.odd_bilhete || 0);
  if (ticket.status_usuario === "green") return valor * (odd - 1);
  if (ticket.status_usuario === "red") return -valor;
  if (ticket.status_usuario === "anulada") return 0;
  return 0;
}

export function exposicaoPendente(tickets) {
  return tickets
    .filter((ticket) => ticket.status_usuario === "pendente")
    .reduce((acc, ticket) => acc + Number(ticket.valor_apostado || 0), 0);
}
