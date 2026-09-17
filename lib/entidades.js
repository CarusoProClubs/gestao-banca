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

const MERCADO_JOGADOR = /cartao|cartão|finaliz|chute|gol|faltas|impedimento|desarme|passe|prorrog/i;

export function detectarLiga(texto) {
  const blob = String(texto || "");
  for (const liga of LIGAS) {
    if (liga.testes.some((teste) => teste.test(blob))) return liga.nome;
  }
  return null;
}

function pareceJogo(texto) {
  const n = String(texto || "");
  return /\s[-x×]\s/.test(n) || /\s&\s/.test(n) || /\sversus\s/i.test(n);
}

export function extrairEntidades(perna = {}, ticket = {}) {
  const bruto = corrigirTime(perna.selecao || "");
  const jogo = corrigirTime(perna.jogo || ticket.jogo || "");
  const contexto = `${bruto} ${jogo} ${ticket.titulo || ""}`;
  const mercado = String(perna.mercado || "");
  const entreParenteses = bruto.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  const ehJogador = Boolean(entreParenteses) && !pareceJogo(bruto) && (MERCADO_JOGADOR.test(mercado) || MERCADO_JOGADOR.test(contexto));
  const jogador = ehJogador ? limparSujeiraOcr(entreParenteses[1]) : null;
  const clubeDoJogador = ehJogador ? corrigirTime(entreParenteses[1] ? entreParenteses[2] : "") : null;
  const clubesDoJogo = pareceJogo(jogo || bruto)
    ? String(jogo || bruto)
        .split(/\s[-x×&]\s|\sversus\s/i)
        .map((parte) => corrigirTime(parte))
        .filter((parte) => parte.length > 2)
    : [];
  const clube = clubeDoJogador || clubesDoJogo[0] || null;
  return {
    ...perna,
    selecao: bruto,
    jogo: jogo || perna.jogo || null,
    jogador: jogador && jogador.length > 2 ? jogador : null,
    clube,
    clubes: clubeDoJogador ? [clubeDoJogador] : clubesDoJogo,
    liga: perna.liga || detectarLiga(contexto),
  };
}

export function entidadesDoBilhete(ticket) {
  const pernas = (ticket.payload?.pernas || ticket.pernas || []).map((perna) => extrairEntidades(perna, ticket));
  const clubes = [...new Set(pernas.flatMap((p) => p.clubes || (p.clube ? [p.clube] : [])).filter(Boolean))];
  const jogadores = [...new Set(pernas.map((p) => p.jogador).filter(Boolean))];
  const ligas = [...new Set(pernas.map((p) => p.liga).filter(Boolean))];
  if (!ligas.length) {
    const liga = detectarLiga(`${ticket.titulo || ""} ${ticket.jogo || ""}`);
    if (liga) ligas.push(liga);
  }
  return { pernas, clubes, jogadores, ligas };
}
