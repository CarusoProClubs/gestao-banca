const SECOES = [
  [/^FUTEBOL$/i, "futebol"],
  [/^FUTEBOL AMERICANO(?:\s*\(.*\))?$/i, "NFL"],
  [/^FUTEBOL AMERICANO UNIVERSITARIO(?:\s*\(.*\))?$/i, "NCAA"],
  [/^(BEISEBOL|MLB)(?:\s*\(.*\))?.*$/i, "MLB"],
  [/^(BASQUETE|WNBA)(?:\s*\(.*\))?.*$/i, "basquete"],
  [/^T[EÉ]NIS$/i, "tênis"],
  [/^GOLFE$/i, "golfe"],
];

const CAMPOS = new Map([
  ["melhor preco", "melhorOdd"],
  ["melhor odd", "melhorOdd"],
  ["preco de risco", "risco"],
  ["preco de risco com chance", "risco"],
  ["odd de risco", "risco"],
  ["odd de risco com chance", "risco"],
  ["resumo do cenario", "resumo"],
  ["cenario", "resumo"],
  ["o que pesa", "oQuePesa"],
  ["leitura", "leitura"],
  ["mercado", "mercado"],
  ["probabilidade", "probabilidade"],
  ["probabilidade estimada", "probabilidade"],
  ["odd", "odd"],
  ["preco", "odd"],
]);

const STOP = /^(ORDEM SUGERIDA|AVISO|FIM DO ARQUIVO)/i;

function semAcentos(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function inferEsporte(texto) {
  const n = semAcentos(String(texto || "")).toLowerCase();
  if (/\bnfl\b|lions|bills|thursday night/.test(n)) return "NFL";
  if (/\bwnba\b|aces|storm|sparks|dream|mystics|sky|mercury|fire/.test(n)) return "basquete";
  if (/\bmlb\b|dodgers|phillies|mets|rays|padres|reds|athletics|rockies|brewers|pirates/.test(n)) return "MLB";
  if (/tenis|wta|atp/.test(n)) return "tênis";
  if (/golfe|pga/.test(n)) return "golfe";
  if (/ncaa|college|syracuse|pittsburgh/.test(n)) return "NCAA";
  return "futebol";
}

function horaDe(texto) {
  const m = String(texto || "").match(/\b(\d{1,2}h\d{0,2})\b/i);
  return m ? m[1] : "";
}

function limpar(texto) {
  return String(texto || "")
    .replace(/[\u2014\u2013]/g, "—")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function limparTitulo(texto) {
  return limpar(String(texto || "").replace(/^>>>\s*/, ""));
}

function chaveCampo(texto) {
  return semAcentos(String(texto || ""))
    .toLowerCase()
    .replace(/^[-–—•*]+\s*/, "")
    .replace(/:.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function chaveJogo(valor) {
  return semAcentos(String(valor || ""))
    .toLowerCase()
    .replace(/\s+@\s+/g, " x ")
    .replace(/\s+vs?\.?\s+/g, " x ")
    .replace(/\s+x\s+/g, " x ")
    .replace(/[^a-z0-9x]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function montarPrincipal(titulo, corpo) {
  const linhas = String(corpo || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const tituloPartes = limpar(titulo).split(/\s+[—-]\s+/).map((p) => p.trim()).filter(Boolean);
  const jogo = tituloPartes[0] || limpar(titulo);
  const linhaCabecalho = linhas[0] || "";
  const hora = horaDe(linhaCabecalho) || horaDe(titulo);
  const ligaDoTitulo = tituloPartes.slice(1).find((p) => !horaDe(p) && !/^O JOGO/i.test(p)) || "";
  const liga = ligaDoTitulo || limpar(linhaCabecalho.split(/\s+[—-]\s+/)[0] || "");
  const transmissao = linhas.find((linha) => /^(ESPN|Disney\+|CazeTV|Prime Video|FOX|USA Network|ESPN \+|Paramount\+|Globoplay)/i.test(linha)) || "";

  return {
    jogo,
    principal: true,
    esporte: inferEsporte(`${titulo} ${corpo}`),
    liga,
    hora,
    noticia: limpar(linhas[1] || linhas[0] || ""),
    detalhe: linhas.join("\n"),
    transmissao,
    melhorOdd: "",
    risco: "",
    mercado: "",
    odd: "",
    probabilidade: "",
    resumo: "",
    oQuePesa: "",
    leitura: "",
    mercado: "",
    odd: "",
    probabilidade: "",
  };
}

function expandirPrincipal(titulo, corpo) {
  const partes = limpar(titulo)
    .split(/\s+e\s+(?=[^()]+\(\d{1,2}h\d{0,2}\))/i)
    .map((parte) => parte.trim())
    .filter(Boolean);

  if (partes.length < 2) return [montarPrincipal(titulo, corpo)];

  return partes.map((parte) => {
    const horaMatch = parte.match(/\((\d{1,2}h\d{0,2})\)/i);
    const jogo = limpar(parte.replace(/\s*\(\d{1,2}h\d{0,2}\)\s*$/i, ""));
    return montarPrincipal(`${jogo} — ${horaMatch?.[1] || ""}`.trim(), corpo);
  });
}

function parseTituloDetalhado(texto, esporte) {
  const titulo = limparTitulo(texto);
  const partes = titulo.split(/\s+—\s+/).map((p) => p.trim()).filter(Boolean);
  if (!partes.length) return null;

  let jogo = partes[0];
  const meta = partes.slice(1);
  if (/^JOGO\s+\d+$/i.test(jogo) && meta.length) {
    jogo = meta.shift();
  }

  if (/^OUTROS\s+/i.test(jogo) || /^CARD\s+COMPLETO/i.test(jogo)) return null;

  const horario = horaDe(titulo);
  const liga = meta.find((p) => p && !horaDe(p) && !/^O JOGO/i.test(p)) || "";

  return {
    jogo: limpar(jogo),
    principal: false,
    esporte,
    liga: limpar(liga),
    hora: horario,
    noticia: limparTitulo(texto),
    detalhe: "",
    transmissao: "",
    melhorOdd: "",
    risco: "",
    mercado: "",
    odd: "",
    probabilidade: "",
    resumo: "",
    oQuePesa: "",
    leitura: "",
    buffer: [],
  };
}

function parseCampos(detalhe) {
  const campos = {
    melhorOdd: "",
    risco: "",
    resumo: "",
    oQuePesa: "",
    leitura: "",
    mercado: "",
    odd: "",
    probabilidade: "",
    entradas: [],
    extra: [],
  };

  let atual = null;
  const linhas = String(detalhe || "")
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);

  for (const linha of linhas) {
    const inline = linha.match(/^\s*(?:mercado)\s*:\s*(.*?)\s*\|\s*(?:odd|preço)\s*:\s*([0-9]+(?:[.,][0-9]+)?)\s*\|\s*(?:probabilidade(?: estimada)?)\s*:\s*([0-9]+(?:[.,][0-9]+)?%?)\s*$/i);
    if (inline) {
      const entrada = { mercado: inline[1].trim(), odd: inline[2].replace(",", "."), probabilidade: inline[3].trim() };
      campos.entradas.push(entrada);
      if (!campos.mercado) {
        campos.mercado = entrada.mercado;
        campos.odd = entrada.odd;
        campos.probabilidade = entrada.probabilidade;
      }
      atual = null;
      continue;
    }
    const chave = chaveCampo(linha);
    const campo = CAMPOS.get(chave);
    if (campo) {
      atual = campo;
      continue;
    }

    if (atual) {
      campos[atual] = campos[atual]
        ? `${campos[atual]} ${linha}`
        : linha;
    } else {
      campos.extra.push(linha);
    }
  }

  return campos;
}

function flushDetalhe(atual, detalhes) {
  if (!atual?.jogo) return;
  const detalhe = (atual.buffer || []).join("\n").trim();
  const campos = parseCampos(detalhe);
  detalhes.push({
    ...atual,
    ...campos,
    detalhe,
  });
  delete detalhes[detalhes.length - 1].buffer;
}

export function parseBoletimTxt(raw) {
  const texto = String(raw || "").replace(/\r/g, "");
  const linhas = texto.split("\n");
  const primeira = linhas.find((l) => l.trim()) || "Boletim do dia";
  const manchete = primeira.replace(/^NEWSLETTER[^\n—-]*[—-]\s*/i, "").trim() || primeira.trim();

  const antesPartes = (texto.split(/={5,}/)[0] || "");
  const geral = antesPartes
    .split("\n")
    .slice(1)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^NEWSLETTER/i.test(l))
    .join(" ");

  const parte1 = (texto.split(/PARTE\s*1/i)[1] || "").split(/PARTE\s*2/i)[0] || "";
  const parte2 = texto.split(/PARTE\s*2/i)[1] || "";

  const principais = [];
  const blocos1 = parte1.split(/\n(?=\s*\d+\)\s+)/);
  for (const bloco of blocos1) {
    const topo = bloco.match(/^\s*\d+\)\s*(.+)$/m);
    if (!topo) continue;
    const titulo = topo[1].trim();
    const corpo = bloco.replace(/^\s*\d+\)\s*.+$/m, "").trim();
    principais.push(...expandirPrincipal(titulo, corpo));
  }

  const detalhes = [];
  let esporte = "futebol";
  let atual = null;

  const flush = () => {
    flushDetalhe(atual, detalhes);
    atual = null;
  };

  for (const linha of parte2.split("\n")) {
    const t = linha.trim();
    if (!t) continue;

    const secao = SECOES.find(([regex]) => regex.test(semAcentos(t)));
    if (secao) {
      flush();
      esporte = secao[1];
      continue;
    }

    if (STOP.test(t)) {
      flush();
      break;
    }

    if (/^-+$/.test(t) || /^PARTE/i.test(t)) continue;

    if (/^>>>/.test(t)) {
      flush();
      const novo = parseTituloDetalhado(t, esporte);
      if (novo) atual = novo;
      continue;
    }

    if (atual) atual.buffer.push(t);
  }
  flush();

  const jogos = [...principais];
  const indice = new Map();
  jogos.forEach((jogo, index) => {
    const chave = chaveJogo(jogo.jogo);
    if (chave) indice.set(chave, index);
  });

  for (const extra of detalhes) {
    const chave = chaveJogo(extra.jogo);
    const posicao = indice.get(chave);
    if (posicao !== undefined) {
      const alvo = jogos[posicao];
      jogos[posicao] = {
        ...alvo,
        esporte: alvo.esporte || extra.esporte,
        liga: alvo.liga || extra.liga,
        hora: alvo.hora || extra.hora,
        noticia: alvo.noticia || extra.noticia,
        transmissao: alvo.transmissao || extra.transmissao,
        melhorOdd: extra.melhorOdd || alvo.melhorOdd,
        risco: extra.risco || alvo.risco,
        resumo: extra.resumo || alvo.resumo,
        oQuePesa: extra.oQuePesa || alvo.oQuePesa,
        leitura: extra.leitura || alvo.leitura,
        mercado: extra.mercado || alvo.mercado,
        odd: extra.odd || alvo.odd,
        probabilidade: extra.probabilidade || alvo.probabilidade,
        entradas: [...(alvo.entradas || []), ...(extra.entradas || [])],
        detalhe: extra.detalhe || alvo.detalhe,
        extra: extra.extra || alvo.extra || [],
      };
    } else {
      const novoIndex = jogos.length;
      jogos.push({ ...extra, principal: false });
      indice.set(chave, novoIndex);
    }
  }

  const esportes = [];
  for (const jogo of jogos) {
    if (jogo.esporte && !esportes.includes(jogo.esporte)) esportes.push(jogo.esporte);
  }

  return { bruto: raw, manchete, geral, jogos, esportes };
}
