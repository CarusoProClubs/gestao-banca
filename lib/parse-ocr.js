import { corrigirTime } from "./times";

function parseMoney(raw) {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}
function parseOdd(raw) {
  const value = Number(raw.replace(",", "."));
  return Number.isFinite(value) && value >= 1 ? value : null;
}
function normalize(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[|\u00ae\u00a9@\u20ac\u201c\u201d"']/g, " ").replace(/\s+/g, " ").trim();
}
function detectTipo(text) {
  const n = normalize(text).toLowerCase();
  if (/\btripla\b/.test(n)) return "tripla";
  if (/\bdupla\b/.test(n)) return "dupla";
  if (/\bmultipla\b/.test(n)) return "multipla";
  if (/\bsimples\b/.test(n)) return "simples";
  return null;
}
function detectStatus(text) {
  const n = normalize(text).toLowerCase();
  if (/\bganhou\b/.test(n) || /\bcganhou\b/.test(n)) return "ganhou";
  if (/\bperdida\b/.test(n) || /\bberdida\b/.test(n) || /\bbendida\b/.test(n) || /\bberdidg\b/.test(n)) return "perdida";
  if (/\banulada\b/.test(n)) return "anulada";
  return "pendente";
}
function detectMercado(line) {
  const n = normalize(line).toLowerCase();
  if (n.includes("resultado final")) return "resultado_final";
  if (n.includes("receber um cart")) return "receber_cartao";
  if (n.includes("qualificar")) return "qualificar_se";
  return null;
}
function isNoiseLine(line) {
  const n = normalize(line).toLowerCase();
  return /^(simples|dupla|tripla|multipla|ganhos|id:|betano)\b/.test(n) || n.includes("criar aposta") || n.startsWith("id:") || n.startsWith("ganhos") || /\b(perdida|ganhou|berdida|bendida|berdidg|pendente)\b/.test(n);
}
function cleanLabel(value) {
  return corrigirTime(normalize(value).replace(/\b(perdida|ganhou|berdida|bendida|berdidg|pendente)\b/gi, " ").replace(/[\u2122\u00ae]+/g, " ").replace(/^[^A-Za-z0-9]+/, " "));
}
function cleanJogo(value) {
  if (!value) return null;
  const cleaned = corrigirTime(normalize(value).replace(/\s*Pontuac.*$/i, ""));
  return cleaned.length > 3 ? cleaned : null;
}
export function parseOcrText(raw) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const blob = lines.join("\n");
  const avisos = ["Leitura do print. Confira antes de confirmar."];
  const tipo = detectTipo(blob);
  const formato = /criar\s*aposta/i.test(blob) ? "criar_aposta" : tipo ? "classica" : null;
  const valorMatch = blob.match(/R\$\s*([\d.]+,\d{2})/i);
  const ganhosMatch = blob.match(/Ganhos[\s\S]{0,24}R\$\s*([\d.]+,\d{2})/i) || blob.match(/Ganhos[\s\S]{0,24}RS\s*([\d.]+,\d{2})/i);
  const idMatch = blob.match(/ID:\s*(\d{6,})/i);
  const dateMatch = blob.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}:\d{2})/);
  let titulo = null;
  const caMatch = blob.match(/CA\s+([^\n]+)/i);
  if (caMatch) titulo = cleanLabel(caMatch[1]);
  let oddBilhete = null;
  const criarOdd = blob.match(/criar\s*aposta[^\d]{0,16}(\d+[.,]\d{2})/i);
  if (criarOdd) oddBilhete = parseOdd(criarOdd[1]);
  const pernas = [];
  const pushPerna = (selecao, extra = {}) => {
    const clean = cleanLabel(selecao);
    if (!clean || isNoiseLine(clean) || clean.length < 3) return;
    if (pernas.some((perna) => perna.selecao === clean)) return;
    pernas.push({ ordem: pernas.length + 1, jogo: extra.jogo ?? null, selecao: clean, mercado: extra.mercado ?? null, odd_perna: extra.odd_perna ?? null, placar_print: extra.placar_print ?? null, status_print: extra.status_print ?? "desconhecido" });
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = normalize(lines[i]);
    const next = normalize(lines[i + 1] ?? "");
    const oddMatch = line.match(/(\d+[.,]\d{2})\s*$/);
    if (/receber um cart/i.test(line) && pernas.length) { pernas[pernas.length - 1].mercado = "receber_cartao"; continue; }
    if (/qualificar/i.test(line) && pernas.length) { pernas[pernas.length - 1].mercado = "qualificar_se"; continue; }
    if (/resultado final/i.test(line) && pernas.length && !pernas[pernas.length - 1].mercado) pernas[pernas.length - 1].mercado = "resultado_final";
    if (oddMatch && !/R\$|Ganhos|ID:/i.test(line) && !/criar aposta/i.test(line)) {
      const odd = parseOdd(oddMatch[1]);
      const selecao = line.replace(oddMatch[1], "").trim();
      if (odd && selecao) pushPerna(selecao, { odd_perna: odd, mercado: detectMercado(next) });
    }
    if (/\([^)]+\)/.test(line) && !/CA\s/i.test(line) && !/ID:/.test(line) && !/\b(perdida|ganhou|berdida|bendida|berdidg)\b/i.test(line)) {
      pushPerna(line, { mercado: detectMercado(next) });
    }
    const score = line.match(/Pontuac\w*:\s*(\d+\s*-\s*\d+)/i);
    if (score && pernas.length) {
      const jogoMatch = line.match(/([A-Za-z].+?\s-\s+[A-Za-z][^-]+?)(?:\s+Pontua|$)/);
      if (jogoMatch) {
        const jogo = cleanJogo(jogoMatch[1]);
        if (jogo && !pernas[pernas.length - 1].jogo) pernas[pernas.length - 1].jogo = jogo;
      }
      pernas[pernas.length - 1].placar_print = score[1].replace(/\s+/g, "");
    }
  }
  const pernasLimpas = pernas.filter((perna, _, list) => {
    if (!perna.odd_perna && !perna.mercado) return false;
    return !list.find((other) => other !== perna && other.selecao === perna.selecao && other.odd_perna && !perna.odd_perna);
  }).map((perna, index) => ({ ...perna, ordem: index + 1, selecao: corrigirTime(perna.selecao), jogo: cleanJogo(perna.jogo) }));
  if (!oddBilhete && pernasLimpas.length && pernasLimpas.every((p) => p.odd_perna)) {
    oddBilhete = Number(pernasLimpas.reduce((acc, p) => acc * (p.odd_perna ?? 1), 1).toFixed(2));
  }
  if (!oddBilhete && tipo === "simples") oddBilhete = pernasLimpas.find((p) => p.odd_perna)?.odd_perna ?? null;
  const valor = valorMatch ? parseMoney(valorMatch[1]) : null;
  const status = detectStatus(blob);
  let retorno = ganhosMatch ? parseMoney(ganhosMatch[1]) : null;
  if (retorno == null && status === "perdida") retorno = 0;
  if (!titulo) titulo = pernasLimpas.map((p) => p.selecao).filter(Boolean).join(", ") || null;
  titulo = titulo ? cleanLabel(titulo) : null;
  for (const perna of pernasLimpas) {
    if (status === "ganhou") perna.status_print = "acertou";
    if (status === "perdida" && pernasLimpas.length === 1) perna.status_print = "errou";
  }
  return {
    versao: "1.0",
    origem: "site_png",
    casa: "Betano",
    id_casa: idMatch?.[1] ?? null,
    codigo_booking: null,
    data_hora: dateMatch ? `${dateMatch[1].split("/").reverse().join("-")}T${dateMatch[2]}:00` : null,
    tipo,
    formato,
    titulo,
    valor_apostado: valor,
    moeda: "BRL",
    odd_bilhete: oddBilhete,
    retorno_casa: retorno,
    status_print: status,
    status_usuario: "pendente",
    esporte: "futebol",
    jogo: pernasLimpas[0]?.jogo ?? null,
    pernas: pernasLimpas,
    confianca: idMatch && valor ? 0.8 : 0.45,
    avisos,
  };
}
