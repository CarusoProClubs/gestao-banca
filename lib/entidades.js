import { corrigirTime, limparSujeiraOcr } from "./times";

const LIGAS = [
  { nome: "Brasileirão", testes: [/brasileirao/i, /serie a/i, /série a/i, /brasileiro/i] },
  { nome: "Série B", testes: [/serie b/i, /série b/i] },
  { nome: "Libertadores", testes: [/libertadores/i] },
  { nome: "Sul-Americana", testes: [/sul[\s-]*americana/i] },
  { nome: "Copa do Brasil", testes: [/copa do brasil/i] },
  { nome: "Champions League", testes: [/champions/i, /liga dos campeoes/i] },
  { nome: "Europa League", testes: [/europa league/i] },
  { nome: "Premier League", testes: [/premier league/i] },
  { nome: "La Liga", testes: [/la liga/i, /laliga/i] },
  { nome: "Serie A Itália", testes: [/serie a italiana/i] },
  { nome: "Mundial", testes: [/mundial/i] },
];

export function detectarLiga(texto) {
  const blob = String(texto || "");
  for (const liga of LIGAS) {
    if (liga.testes.some((teste) => teste.test(blob))) return liga.nome;
  }
  return null;
}

export function extrairEntidades(perna = {}, ticket = {}) {
  const bruto = corrigirTime(perna.selecao || ticket.titulo || "");
  const jogo = corrigirTime(perna.jogo || ticket.jogo || "");
  const contexto = `${bruto} ${jogo} ${ticket.titulo || ""} ${ticket.esporte || ""}`;
  const entreParenteses = bruto.match(/\(([^)]+)\)/);
  const clube = entreParenteses ? corrigirTime(entreParenteses[1]) : (jogo || null);
  const jogador = limparSujeiraOcr(bruto.replace(/\([^)]*\)/g, ""));
  return {
    ...perna,
    selecao: bruto,
    jogo: jogo || perna.jogo || null,
    jogador: jogador || null,
    clube: clube || null,
    liga: perna.liga || detectarLiga(contexto),
  };
}

export function entidadesDoBilhete(ticket) {
  const pernas = (ticket.payload?.pernas || ticket.pernas || []).map((perna) => extrairEntidades(perna, ticket));
  const clubes = [...new Set(pernas.map((p) => p.clube).filter(Boolean))];
  const jogadores = [...new Set(pernas.map((p) => p.jogador).filter(Boolean))];
  const ligas = [...new Set(pernas.map((p) => p.liga).filter(Boolean))];
  if (!ligas.length) {
    const liga = detectarLiga(`${ticket.titulo || ""} ${ticket.jogo || ""}`);
    if (liga) ligas.push(liga);
  }
  return { pernas, clubes, jogadores, ligas };
}
