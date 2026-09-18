/** @typedef {'pendente' | 'green' | 'red' | 'anulada' | 'cashout'} StatusUsuario */

export const STATUS_USUARIO = ["pendente", "green", "red", "anulada", "cashout"];

export const emptySettings = {
  salario_mensal: 5000,
  percentual_lazer: 0.08,
  meta_lucro: 0.2,
  stake_padrao: 0.02,
};

export function orcamentoProtegido(settings) {
  return Number(settings.salario_mensal) * Number(settings.percentual_lazer);
}

export function numeroFinito(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function lucroBilhete(ticket) {
  const valor = numeroFinito(ticket?.valor_apostado) ?? 0;
  const odd = numeroFinito(ticket?.odd_bilhete) ?? 0;

  if (ticket?.status_usuario === "green") return valor * (odd - 1);
  if (ticket?.status_usuario === "red") return -valor;
  if (ticket?.status_usuario === "cashout") {
    const resgatado = numeroFinito(ticket?.valor_resgatado);
    return resgatado == null ? 0 : resgatado - valor;
  }
  if (ticket?.status_usuario === "anulada") return 0;
  return 0;
}

export function validarFinanceiro(ticket) {
  const avisos = [];
  const stake = numeroFinito(ticket?.valor_apostado);
  const odd = numeroFinito(ticket?.odd_bilhete);
  const resgatado = numeroFinito(ticket?.valor_resgatado);

  if (stake == null || stake <= 0) avisos.push("Informe um valor apostado maior que zero.");
  if (ticket?.status_usuario === "green" && (odd == null || odd <= 0)) {
    avisos.push("Um green precisa de uma odd total válida.");
  }
  if (ticket?.status_usuario === "cashout" && (resgatado == null || resgatado < 0)) {
    avisos.push("Um cashout precisa do valor resgatado.");
  }
  return avisos;
}

export function exposicaoPendente(tickets) {
  return tickets
    .filter((ticket) => ticket.status_usuario === "pendente")
    .reduce((acc, ticket) => acc + (numeroFinito(ticket.valor_apostado) ?? 0), 0);
}
