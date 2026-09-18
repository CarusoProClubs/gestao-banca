import { textoLimpo } from "./texto-limpo";

const MIUDAS = new Set(["de", "da", "do", "das", "dos", "del", "e", "x", "em", "na", "no", "a", "o"]);
const SIGLAS = new Map([
  ["nfl", "NFL"], ["mlb", "MLB"], ["wnba", "WNBA"], ["ncaa", "NCAA"],
  ["espn", "ESPN"], ["fox", "FOX"], ["usa network", "USA Network"],
  ["prime video", "Prime Video"], ["cazetv", "CazeTV"], ["disney+", "Disney+"],
]);

const ABERTURAS = [
  "Tem jogo grande na pauta, e esse aqui merece atenção.",
  "Vale colocar esse duelo no radar, porque o cenário tem história para contar.",
  "Aqui a história começa por um detalhe importante: o jogo chega com bastante coisa em jogo.",
  "Esse é daqueles confrontos que pedem um olho no placar e outro no contexto.",
  "Na pauta de hoje, esse duelo aparece com alguns ingredientes bem interessantes.",
  "Tem bastante coisa para acompanhar por aqui, e o principal detalhe está no cenário da partida.",
];

function normalizar(valor) {
  return textoLimpo(valor || "")
    .replace(/\s+/g, " ")
    .trim();
}

function frase(valor) {
  const texto = normalizar(valor);
  if (!texto) return "";
  return /[.!?]$/.test(texto) ? texto : `${texto}.`;
}

function escolherAbertura(jogo) {
  const texto = `${jogo?.jogo || ""}-${jogo?.liga || ""}`;
  const soma = [...texto].reduce((total, letra) => total + letra.charCodeAt(0), 0);
  return ABERTURAS[soma % ABERTURAS.length];
}

export function nomeProprio(valor) {
  return String(valor || "")
    .toLowerCase()
    .replace(/\s+@\s+/g, " x ")
    .split(/\s+/)
    .map((parte, index) => {
      if (!parte || parte === "x") return parte;
      if (index && MIUDAS.has(parte)) return parte;
      if (SIGLAS.has(parte)) return SIGLAS.get(parte);
      return parte.charAt(0).toUpperCase() + parte.slice(1);
    })
    .join(" ")
    .trim()
    .replace(/\bCopa Da\b/g, "Copa da")
    .replace(/\bLiga Da\b/g, "Liga da");
}

function polirMercado(valor) {
  return normalizar(valor)
    .replace(/^(.+?)\s+vencedor da partida\s+favorito forte\b/i, "$1 como vencedor da partida, que aparece como favorito forte")
    .replace(/^(.+?)\s+vencedor da partida\s+favorito\b/i, "$1 como vencedor da partida, que aparece como favorito")
    .replace(/\s+favorito forte\b/gi, " aparece como favorito forte")
    .replace(/\s+favorito\b/gi, " aparece como favorito")
    .replace(/\s+azarão\b/gi, " aparece como azarão")
    .replace(/^[-•*]+\s*/, "")
    .trim();
}

function montarRodape(jogo) {
  const partes = [];
  if (jogo?.hora) partes.push(`às ${jogo.hora}`);
  if (jogo?.transmissao) partes.push(`com transmissão por ${jogo.transmissao.replace(/[.]$/, "")}`);
  return partes.join(" ");
}

function corteNatural(texto, limite = 520) {
  const limpo = normalizar(texto);
  if (!limpo || limpo.length <= limite) return limpo;
  const corte = limpo.slice(0, limite);
  const ponto = Math.max(corte.lastIndexOf(". "), corte.lastIndexOf(" — "), corte.lastIndexOf(", "));
  return `${corte.slice(0, ponto > 200 ? ponto + 1 : limite).trim()}…`;
}

export function chamadaBancada(jogos) {
  const lista = (jogos || []).filter((j) => j?.jogo).slice(0, 6);
  if (!lista.length) return "";

  const primeiro = lista[0];
  const nome = nomeProprio(primeiro.jogo);
  const tempo = primeiro.hora ? `às ${primeiro.hora}` : "";
  const resumo = primeiro.resumo || primeiro.leitura || primeiro.noticia;
  const outros = lista.slice(1).map((j) => nomeProprio(j.jogo));

  let texto = `O dia já começa com jogo grande: ${nome}${tempo ? `, ${tempo}` : ""}.`;
  if (resumo) texto += ` ${frase(resumo)}`;
  if (outros.length) {
    const listaOutros = outros.slice(0, 5);
    const nomes = listaOutros.length === 1
      ? listaOutros[0]
      : `${listaOutros.slice(0, -1).join(", ")} e ${listaOutros.at(-1)}`;
    texto += ` E o card não para por aí: ${nomes} também entram na pauta.`;
  }
  return texto;
}

function numero(valor) { const n = Number(String(valor || "").replace("%","").replace(",",".")); return Number.isFinite(n) ? n : null; }

export function valorEntrada(entrada) {
  const odd = numero(entrada?.odd);
  const prob = numero(entrada?.probabilidade);
  if (!odd || !prob || odd <= 1 || prob <= 0) return null;
  const implicita = 100 / odd;
  const valor = prob - implicita;
  return { odd, probabilidade: prob, implicita, valor, temValor: valor >= 2, forte: valor >= 5 };
}

export function entradasComValor(jogo) {
  return (jogo?.entradas || []).map((entrada) => ({ ...entrada, valor: valorEntrada(entrada) })).filter((e) => e.valor);
}

export function vozMateria(jogo) {
  if (!jogo) return "";
  const nome = nomeProprio(jogo.jogo);
  const contexto = jogo.resumo || jogo.leitura || jogo.oQuePesa || jogo.noticia;
  const entrada = entradasComValor(jogo)[0];
  const abertura = escolherAbertura(jogo);
  const rodape = montarRodape(jogo);
  const partes = [
    abertura,
    `${nome} ${jogo.liga ? `pela ${jogo.liga}` : ""}${rodape ? ` ${rodape}` : ""}.`.replace(/\s+/g, " "),
    frase(contexto),
    entrada ? `E tem preço para colocar no radar: ${entrada.mercado || "a entrada indicada"} a ${entrada.odd}, com estimativa de ${entrada.probabilidade}%.` : "",
  ].filter(Boolean);
  return corteNatural(partes.join(" "));
}

export function vozDetalhe(jogo) {
  if (!jogo) return "";

  const blocos = [];
  const nome = nomeProprio(jogo.jogo);
  const cabecalho = [
    jogo.liga ? `pela ${jogo.liga}` : "",
    jogo.hora ? `às ${jogo.hora}` : "",
  ].filter(Boolean).join(" ");

  if (cabecalho) blocos.push(`${nome} entra em campo ${cabecalho}.`);
  if (jogo.resumo) blocos.push(`O cenário é este: ${frase(jogo.resumo)}`);
  if (jogo.oQuePesa) blocos.push(`O que pode virar a história do jogo: ${frase(jogo.oQuePesa)}`);
  if (jogo.melhorOdd) blocos.push(`No preço mais confortável, ${frase(polirMercado(jogo.melhorOdd))}`);
  if (jogo.risco) blocos.push(`Para quem procura uma linha mais esticada, ${frase(polirMercado(jogo.risco))}`);
  if (jogo.leitura) blocos.push(`A leitura da partida: ${frase(jogo.leitura)}`);
  const entradas = entradasComValor(jogo);
  if (entradas.length) {
    blocos.push(`Entradas que chamam atenção: ${entradas.map((e) => `${e.mercado || "mercado"} a ${e.odd}, com ${e.probabilidade}% estimados`).join("; ")}.`);
  }
  if (jogo.transmissao) blocos.push(`Na transmissão, ${jogo.transmissao.replace(/[.]$/, "")}.`);

  if (!blocos.length && jogo.detalhe) return normalizar(jogo.detalhe);
  return blocos.join("\n\n");
}

export function vozTexto(valor) {
  return normalizar(valor)
    .replace(/^resumo:?\s*/i, "Em resumo, ")
    .replace(/^o que pesa:?\s*/i, "O que pesa neste jogo é ")
    .replace(/^leitura:?\s*/i, "A leitura é esta: ")
    .replace(/^melhor preço:?\s*|^melhor odd:?\s*/i, "O preço mais confortável aparece em ")
    .replace(/^preço de risco:?\s*|^odd de risco:?\s*/i, "Quem quiser uma linha mais ousada encontra ")
    .trim();
}

export function vozTrecho(jogo) {
  return vozMateria(jogo);
}
