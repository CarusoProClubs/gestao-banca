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

function centavos(value) {
  const n = numeroFinito(value);
  return n == null ? null : Math.round(n * 100);
}

export function lucroBilhete(ticket) {
  const valor = numeroFinito(ticket?.valor_apostado) ?? 0;
  const odd = numeroFinito(ticket?.odd_bilhete) ?? 0;

  if (ticket?.status_usuario === "green") return valor * (odd - 1);
  if (ticket?.status_usuario === "red") return -valor;
  if (ticket?.status_usuario === "cashout") {
    const resgatado = numeroFinito(ticket?.valor_resgatado);
    return resgatado == null ? 0 : (resgatado - valor);
  }
  if (ticket?.status_usuario === "anulada") return 0;
  return 0;
}

/**
 * Compara odd exibida e retorno sem "corrigir" o valor lido.
 * Casas podem mostrar a odd arredondada enquanto o retorno usa a
 * precisão interna real. Pequenas diferenças são esperadas.
 */
export function reconciliarOddRetorno(ticket) {
  const stake = numeroFinito(ticket?.valor_apostado);
  const oddExibida = numeroFinito(ticket?.odd_bilhete);
  const retorno = numeroFinito(ticket?.retorno_casa);

  if (stake == null || stake <= 0 || oddExibida == null || oddExibida <= 0 || retorno == null || retorno < 0) {
    return { aplicavel: false, status: "incompleto", avisos: [] };
  }

  const impliedOdd = retorno / stake;
  const diff = Math.abs(impliedOdd - oddExibida);

  // Se a diferença cabe no arredondamento de duas casas da odd exibida,
  // aceitamos sem aviso. Ex.: 1,12 exibida com retorno calculado em 1,127...
  const toleranciaArredondamento = 0.0050001;

  if (diff <= toleranciaArredondamento) {
    return {
      aplicavel: true,
      status: "compativel",
      odd_exibida: oddExibida,
      odd_implicita: impliedOdd,
      diferenca: diff,
      avisos: [],
    };
  }

  // Se a divergência altera a casa dos centésimos, pedimos conferência.
  return {
    aplicavel: true,
    status: "divergente",
    odd_exibida: oddExibida,
    odd_implicita: impliedOdd,
    diferenca: diff,
    avisos: [
      `Odd e retorno não fecham entre si: odd exibida ${oddExibida}, retorno/stake implica aproximadamente ${impliedOdd.toFixed(6)}. Confira o print.`,
    ],
  };
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
  const reconciliacao = reconciliarOddRetorno(ticket);
  avisos.push(...reconciliacao.avisos);

  return [...new Set(avisos)];
}

export function exposicaoPendente(tickets) {
  return tickets
    .filter((ticket) => ticket.status_usuario === "pendente")
    .reduce((acc, ticket) => acc + (numeroFinito(ticket.valor_apostado) ?? 0), 0);
}
