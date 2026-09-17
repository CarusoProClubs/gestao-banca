import { NIVEIS } from "./alavancagem";

const MAPA = {
  baixo: "segura",
  baixa: "segura",
  segura: "segura",
  "risco baixo": "segura",
  medio: "media",
  médio: "media",
  media: "media",
  média: "media",
  "risco medio": "media",
  "risco médio": "media",
  alto: "alta",
  alta: "alta",
  "risco alto": "alta",
};

function limpar(s) {
  return String(s || "").replace(/\r/g, "").trim();
}

function chaveNivel(texto) {
  const t = limpar(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/risco\s+/g, "");
  return MAPA[t] || MAPA[t.replace(/\s+/g, " ")] || null;
}

function parseData(pedaco, anoRef) {
  const m = limpar(pedaco).match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?$/);
  if (!m) return null;
  const dia = m[1].padStart(2, "0");
  const mes = m[2].padStart(2, "0");
  let ano = m[3] || String(anoRef);
  if (ano.length === 2) ano = `20${ano}`;
  return `${ano}-${mes}-${dia}`;
}

function parseLinhaEvento(linha, nivel, anoRef) {
  const partes = linha.split("|").map(limpar);
  if (partes.length < 2) return null;
  const cabeca = partes[0];
  const dataHora = cabeca.split(/\s+/);
  const data_evento = parseData(dataHora[0], anoRef);
  const horario = dataHora[1] && /^\d{1,2}:\d{2}/.test(dataHora[1]) ? dataHora[1] : "";
  const resto = partes.slice(1);
  let esporte = "";
  let evento = "";
  let mercado = "";
  let odd = "";
  let motivo = "";
  if (resto.length === 1) {
    evento = resto[0];
  } else if (resto.length === 2) {
    evento = resto[0];
    mercado = resto[1];
  } else {
    esporte = resto[0];
    evento = resto[1];
    mercado = resto[2] || "";
    odd = resto[3] || "";
    motivo = resto.slice(4).join(" | ");
  }
  if (!evento) return null;
  const oddNum = Number(String(odd).replace(",", "."));
  return {
    data_evento,
    horario,
    esporte,
    evento,
    mercado,
    odd_sugerida: Number.isFinite(oddNum) && oddNum > 1 ? oddNum : null,
    nivel,
    motivo,
    status: "ativo",
  };
}

export function limitarX(nivelId, valor, fallback) {
  const n = NIVEIS[nivelId];
  const v = Number(String(valor).replace(",", "."));
  if (!Number.isFinite(v)) return fallback ?? n.multiploMin;
  return Math.min(n.multiploMax, Math.max(n.multiploMin, v));
}

export function parseTxtSemana(texto, inicioSemanaISO) {
  const anoRef = Number((inicioSemanaISO || "2026-01-01").slice(0, 4));
  const erros = [];
  const xs = { segura: 4, media: 7, alta: 12 };
  const eventos = [];
  let nivelAtual = null;
  const linhas = String(texto || "").split(/\n/);

  linhas.forEach((bruta, idx) => {
    const linha = limpar(bruta);
    if (!linha || linha.startsWith("//")) return;
    if (/^semana\b/i.test(linha)) return;

    const headerX = linha.match(/^(baixo|baixa|seguro|segura|medio|médio|media|média|alto|alta)\s*[:=\-]?\s*(\d+([.,]\d+)?)\s*x?$/i);
    if (headerX) {
      const id = chaveNivel(headerX[1]);
      if (id) xs[id] = limitarX(id, headerX[2]);
      return;
    }

    if (linha.startsWith("#")) {
      const id = chaveNivel(linha.replace(/^#+/, ""));
      if (!id) erros.push(`Linha ${idx + 1}: seção "${linha}" não é BAIXO, MEDIO ou ALTO.`);
      nivelAtual = id;
      return;
    }

    if (!nivelAtual) {
      erros.push(`Linha ${idx + 1}: evento sem seção. Coloque # BAIXO, # MEDIO ou # ALTO antes.`);
      return;
    }
    const ev = parseLinhaEvento(linha, nivelAtual, anoRef);
    if (!ev) {
      erros.push(`Linha ${idx + 1}: não entendi. Use data | esporte | jogo | mercado | odd | motivo`);
      return;
    }
    eventos.push(ev);
  });

  return {
    x_baixa: xs.segura,
    x_media: xs.media,
    x_alta: xs.alta,
    eventos,
    erros,
  };
}
