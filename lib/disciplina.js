import { dataDoBilhete } from "./filtros";
import { lucroBilhete } from "./types";
import { resumirAnalise } from "./analise";

export function sequencia(tickets) {
  const fechados = [...tickets]
    .filter((t) => t.status_usuario === "green" || t.status_usuario === "red")
    .sort((a, b) => dataDoBilhete(b) - dataDoBilhete(a));
  if (!fechados.length) return { tipo: "nenhuma", tamanho: 0 };
  const tipo = fechados[0].status_usuario;
  let tamanho = 0;
  for (const ticket of fechados) {
    if (ticket.status_usuario !== tipo) break;
    tamanho += 1;
  }
  return { tipo, tamanho };
}

export function regrasSugeridas(tickets, termo, orcamento) {
  const analise = resumirAnalise(tickets);
  const regras = [];
  if (!termo.seguro) {
    regras.push(`Pare até o próximo período: o caixa familiar já usou mais que o teto (${orcamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).`);
  }
  const faixaRuim = analise.porFaixaOdd.find((row) => row.nome.includes("Acima") && row.red > row.green && row.lucro < 0);
  if (faixaRuim) regras.push("Evite odd acima de 3.00: é a faixa que mais tira dinheiro da banca.");
  const mercadoRuim = analise.porMercado.find((row) => row.qtd >= 2 && row.lucro < 0 && row.acerto < 0.4);
  if (mercadoRuim) regras.push(`Reduza ${mercadoRuim.nome}: acerto baixo e prejuízo acumulado.`);
  const tipoRuim = analise.porTipo.find((row) => /Criar aposta|Múltipla|Tripla/i.test(row.nome) && row.lucro < 0);
  if (tipoRuim) regras.push(`Cuidado com ${tipoRuim.nome}: no histórico esse formato está negativo.`);
  const seq = sequencia(tickets);
  if (seq.tipo === "red" && seq.tamanho >= 2) {
    regras.push(`Você vem de ${seq.tamanho} reds seguidos. Vale um dia sem apostar.`);
  }
  if (!regras.length) regras.push("Disciplina ok: siga o teto do período e registre todo print.");
  return { analise, regras, seq };
}

export function resumoMes(tickets) {
  const lucro = tickets.reduce((acc, t) => acc + lucroBilhete(t), 0);
  const apostado = tickets.reduce((acc, t) => acc + Number(t.valor_apostado || 0), 0);
  const green = tickets.filter((t) => t.status_usuario === "green").length;
  const red = tickets.filter((t) => t.status_usuario === "red").length;
  const cashout = tickets.filter((t) => t.status_usuario === "cashout").length;
  const anulada = tickets.filter((t) => t.status_usuario === "anulada").length;
  const pendente = tickets.filter((t) => t.status_usuario === "pendente").length;
  return { lucro, apostado, green, red, cashout, anulada, pendente, total: tickets.length, roi: apostado ? lucro / apostado : 0 };
}
