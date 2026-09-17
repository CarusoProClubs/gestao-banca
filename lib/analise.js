import { lucroBilhete } from "./types";
import { nomeMercado, nomeTipo } from "./mercados";

function faixaOdd(odd) {
  const value = Number(odd || 0);
  if (value <= 0) return "Sem odd";
  if (value <= 1.8) return "Até 1.80";
  if (value <= 2.1) return "1.81 a 2.10";
  if (value <= 3) return "2.11 a 3.00";
  return "Acima de 3.00";
}

function agrupar(tickets, chaveFn) {
  const map = new Map();
  for (const ticket of tickets) {
    const key = chaveFn(ticket) || "Outros";
    if (!map.has(key)) map.set(key, { nome: key, qtd: 0, green: 0, red: 0, apostado: 0, lucro: 0 });
    const row = map.get(key);
    row.qtd += 1;
    if (ticket.status_usuario === "green") row.green += 1;
    if (ticket.status_usuario === "red") row.red += 1;
    row.apostado += Number(ticket.valor_apostado || 0);
    row.lucro += lucroBilhete(ticket);
  }
  return [...map.values()]
    .map((row) => ({
      ...row,
      acerto: row.green + row.red > 0 ? row.green / (row.green + row.red) : 0,
    }))
    .sort((a, b) => b.lucro - a.lucro);
}

function mercadoDoBilhete(ticket) {
  const pernas = ticket.payload?.pernas || [];
  const bruto = pernas[0]?.mercado || ticket.formato || ticket.tipo || "outros";
  return nomeMercado(bruto);
}

export function resumirAnalise(tickets) {
  const fechados = tickets.filter((t) => t.status_usuario === "green" || t.status_usuario === "red");
  const green = tickets.filter((t) => t.status_usuario === "green").length;
  const red = tickets.filter((t) => t.status_usuario === "red").length;
  const lucro = tickets.reduce((acc, t) => acc + lucroBilhete(t), 0);
  const apostado = tickets.reduce((acc, t) => acc + Number(t.valor_apostado || 0), 0);
  return {
    total: tickets.length,
    green,
    red,
    pendente: tickets.filter((t) => t.status_usuario === "pendente").length,
    acerto: fechados.length ? green / fechados.length : 0,
    apostado,
    lucro,
    roi: apostado > 0 ? lucro / apostado : 0,
    porMercado: agrupar(tickets, mercadoDoBilhete),
    porFaixaOdd: agrupar(tickets, (t) => faixaOdd(t.odd_bilhete)),
    porTipo: agrupar(tickets, (t) => nomeTipo(t.tipo, t.formato)),
    porCasa: agrupar(tickets, (t) => t.casa || "Outras casas"),
  };
}
