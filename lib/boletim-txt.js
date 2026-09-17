function inferEsporte(texto) {
  const n = String(texto || "").toLowerCase();
  if (/\bnfl\b|lions|bills|thursday night/.test(n)) return "NFL";
  if (/\bwnba\b|aces|storm|sparks/.test(n)) return "basquete";
  if (/\bmlb\b|dodgers|phillies|mets|rays|padres/.test(n)) return "MLB";
  if (/t[eê]nis|wta/.test(n)) return "tênis";
  if (/golfe|pga/.test(n)) return "golfe";
  if (/ncaa|college|syracuse|pittsburgh/.test(n)) return "NCAA";
  return "futebol";
}

function horaDe(texto) {
  const m = String(texto || "").match(/(\d{1,2}h\d{0,2})/i);
  return m ? m[1] : "";
}

function limpar(texto) {
  return String(texto || "").replace(/[\u2014\u2013]/g, "—").replace(/\s+/g, " ").trim();
}

export function parseBoletimTxt(raw) {
  const texto = String(raw || "").replace(/\r/g, "");
  const linhas = texto.split("\n");
  const primeira = linhas.find((l) => l.trim()) || "Boletim do dia";
  const manchete = primeira.replace(/^NEWSLETTER[^\n—\-]*[—\-]\s*/i, "").trim() || primeira.trim();
  const antesPartes = texto.split(/={5,}/)[0] || "";
  const geral = antesPartes
    .split("\n")
    .slice(1)
    .map((l) => l.trim())
    .filter((l) => l && !/^NEWSLETTER/i.test(l))
    .join(" ");

  const parte1 = (texto.split(/PARTE\s*1/i)[1] || "").split(/PARTE\s*2/i)[0] || "";
  const parte2 = texto.split(/PARTE\s*2/i)[1] || "";

  const principais = [];
  const blocos1 = parte1.split(/\n(?=\d+\)\s+)/);
  for (const bloco of blocos1) {
    const topo = bloco.match(/^\d+\)\s*(.+)$/m);
    if (!topo) continue;
    const jogo = topo[1].replace(/\s{2,}/g, " ").trim();
    const corpo = bloco.replace(/^\d+\)\s*.+/, "").trim();
    const linha2 = corpo.split("\n").find((l) => l.trim()) || "";
    principais.push({
      jogo,
      principal: true,
      esporte: inferEsporte(`${jogo} ${linha2}`),
      liga: linha2.split(/[\u2014\-]/)[0]?.trim() || "",
      hora: horaDe(linha2),
      noticia: limpar(linha2),
      detalhe: corpo.trim(),
      mercado: "",
      odd: "",
    });
  }

  const detalhes = [];
  let esporte = "futebol";
  let atual = null;
  const flush = () => {
    if (atual?.jogo) {
      atual.detalhe = (atual.buffer || []).join("\n").trim();
      delete atual.buffer;
      detalhes.push(atual);
    }
    atual = null;
  };
  for (const linha of parte2.split("\n")) {
    const t = linha.trim();
    if (/^FUTEBOL AMERICANO UNIVERSITARIO/i.test(t)) {
      flush();
      esporte = "NCAA";
      continue;
    }
    if (/^FUTEBOL AMERICANO/i.test(t)) {
      flush();
      esporte = "NFL";
      continue;
    }
    if (/^FUTEBOL$/i.test(t)) {
      flush();
      esporte = "futebol";
      continue;
    }
    if (/^BEISEBOL|^MLB/i.test(t)) {
      flush();
      esporte = "MLB";
      continue;
    }
    if (/^BASQUETE|^WNBA/i.test(t)) {
      flush();
      esporte = "basquete";
      continue;
    }
    if (/^T[EÉ]NIS/i.test(t)) {
      flush();
      esporte = "tênis";
      continue;
    }
    if (/^GOLFE/i.test(t)) {
      flush();
      esporte = "golfe";
      continue;
    }
    if (/^>>>/.test(t)) {
      flush();
      const titulo = t.replace(/^>>>\s*/, "");
      const jogo = titulo.split(/[\u2014\-]/)[0].trim();
      atual = {
        jogo,
        principal: false,
        esporte,
        liga: titulo.split(/[\u2014\-]/)[1]?.trim() || "",
        hora: horaDe(titulo),
        noticia: limpar(titulo),
        mercado: "",
        odd: "",
        buffer: [],
      };
      continue;
    }
    if (atual && t && !/^-+$/.test(t) && !/^PARTE/.test(t) && !/^AVISO/.test(t) && !/^ORDEM/.test(t) && !/^Fim do arquivo/i.test(t)) {
      atual.buffer.push(t);
    }
  }
  flush();

  const jogos = [...principais];
  for (const extra of detalhes) {
    const chave = extra.jogo.toLowerCase().slice(0, 18);
    const jaTem = jogos.find((j) => j.jogo.toLowerCase().includes(chave.slice(0, 12)) || chave.includes(j.jogo.toLowerCase().slice(0, 12)));
    if (jaTem) {
      jaTem.detalhe = extra.detalhe || jaTem.detalhe;
      if (!jaTem.liga) jaTem.liga = extra.liga;
    } else {
      jogos.push(extra);
    }
  }

  const esportes = [...new Set(jogos.map((j) => j.esporte).filter(Boolean))];
  return { bruto: raw, manchete, geral, jogos, esportes };
}
