const SECOES = [
  [/^FUTEBOL$/i, "futebol"],
  [/^FUTEBOL AMERICANO(?:\s*\(.*\))?$/i, "NFL"],
  [/^FUTEBOL AMERICANO UNIVERSITARIO(?:\s*\(.*\))?$/i, "NCAA"],
  [/^NCAA(?:\s+FOOTBALL)?(?:\s*\(.*\))?$/i, "NCAA"],
  [/^(BEISEBOL|MLB)(?:\s*\(.*\))?.*$/i, "MLB"],
  [/^(BASQUETE|WNBA)(?:\s*\(.*\))?.*$/i, "basquete"],
  [/^T[EÉ]NIS$/i, "tênis"],
  [/^GOLFE$/i, "golfe"],
];

const CAMPOS = new Map([
  ["estatisticas", "estatisticas"],
  ["forma recente", "forma"],
  ["h2h", "h2h"],
  ["desfalques", "desfalques"],
  ["escalacoes", "escalacoes"],
  ["clima", "clima"],
  ["tendencia", "tendencia"],
  ["placar projetado", "placarProjetado"],
  ["total projetado", "totalProjetado"],
  ["linhas de mercado", "linhasMercado"],
  ["fontes", "fontes"],
  ["observacoes", "observacoes"],
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

function secaoDe(texto) {
  const normalizado = semAcentos(String(texto || ""))
    .replace(/\\s+/g, " ")
    .trim()
    .toUpperCase();
  return SECOES.find(([regex]) => regex.test(normalizado))?.[1] || null;
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

function numero(valor) {
  const n = Number(String(valor || "").replace("%", "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function entradaCompacta(jogo, mercado, odd, probabilidade) {
  const oddNormalizada = String(odd || "").replace(",", ".").trim();
  const probNormalizada = String(probabilidade || "").trim();
  const oddNumero = numero(oddNormalizada);

  return {
    jogo,
    principal: true,
    mercado: mercado || "",
    odd: oddNumero !== null ? String(oddNumero) : oddNormalizada,
    probabilidade: probNormalizada,
    entradas: mercado && oddNumero !== null
      ? [{ mercado, odd: String(oddNumero), probabilidade: probNormalizada }]
      : [],
  };
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
    estatisticas: "",
    forma: "",
    h2h: "",
    desfalques: "",
    escalacoes: "",
    clima: "",
    tendencia: "",
    placarProjetado: "",
    totalProjetado: "",
    linhasMercado: [],
    fontes: [],
    observacoes: "",
    atmosfera: "",
    pesoPartida: "",
    mando: "",
    retornos: "",
    arbitragem: "",
    status: "",
    local: "",
    dataHora: "",
    data: "",
    competicao: "",
    evento: "",
    cenarioJogo: "",
    fatoresRisco: "",
    fonte: "",
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

    if (atual && String(atual).startsWith("__extra__:")) {
      const chaveExtra = String(atual).slice("__extra__:".length);
      if (!campos.extraCampos) campos.extraCampos = {};
      campos.extraCampos[chaveExtra] = campos.extraCampos[chaveExtra]
        ? `${campos.extraCampos[chaveExtra]} ${linha}`
        : linha;
    } else if (atual) {
      campos[atual] = campos[atual] ? `${campos[atual]} ${linha}` : linha;
    } else {
      const cabecalho = linha.match(/^([A-ZÁÉÍÓÚÃÕÇ0-9][A-ZÁÉÍÓÚÃÕÇ0-9 _/()-]{1,80}):\\s*(.*)$/);
      if (cabecalho) {
        const nomeExtra = cabecalho[1].trim();
        const valorExtra = cabecalho[2].trim();
        const chaveExtra = semAcentos(nomeExtra).toLowerCase().replace(/\\s+/g, "_");
        if (!campos.extraCampos) campos.extraCampos = {};
        campos.extraCampos[chaveExtra] = valorExtra;
        atual = `__extra__:${chaveExtra}`;
      } else {
        campos.extra.push(linha);
      }
    }
  }

  return campos;
}

function flushDetalhe(atual, detalhes) {
  if (!atual?.jogo) return;
  const detalhe = (atual.buffer || []).join("\n").trim();
  const campos = parseCampos(detalhe);
  detalhes.push({ ...atual, ...campos, detalhe });
  delete detalhes[detalhes.length - 1].buffer;
}


function parseFormatoEsporte(raw) {
  const texto = String(raw || "").replace(/\r/g, "");
  const linhas = texto.split("\n");
  const manchete = (
    linhas.find((l) => /^ANALISE ESPORTIVA DO DIA/i.test(l.trim())) ||
    "Boletim do Dia"
  ).trim();

  function esporteCanonico(valor) {
    const n = semAcentos(valor).toLowerCase().trim();
    if (n.includes("mma") || n.includes("ufc")) return "UFC";
    if (n.includes("automobil")) return "NASCAR";
    if (n.includes("beisebol") || n === "mlb") return "MLB";
    if (n.includes("basquete") || n.includes("wnba")) return "WNBA";
    if (n.includes("futebol americano universit")) return "NCAA";
    if (n.includes("futebol americano") || n === "nfl") return "NFL";
    if (n.includes("futebol australiano") || n === "afl") return "AFL";
    if (n.includes("golfe")) return "Golfe";
    if (n.includes("motogp") || n.includes("moto gp")) return "MotoGP";
    if (n === "nhl" || n.includes("hockey")) return "NHL";
    if (n.includes("tenis")) return "Tênis";
    if (n.includes("futebol") || n === "mls") return "Futebol";
    return valor.trim() || "Outros";
  }

  function limparValor(valor) {
    return limpar(String(valor || ""));
  }

  function linhasCampo(bloco, nome) {
    const linhasBloco = bloco.split("\n");
    const indice = linhasBloco.findIndex((linha) =>
      new RegExp("^" + nome + ":\\s*", "i").test(linha.trim())
    );
    if (indice < 0) return [];
    const primeira = linhasBloco[indice].replace(
      new RegExp("^" + nome + ":\\s*", "i"),
      ""
    ).trim();
    const resultado = primeira ? [primeira] : [];
    for (let i = indice + 1; i < linhasBloco.length; i += 1) {
      const linha = linhasBloco[i].trim();
      if (/^[A-ZÁÉÍÓÚÃÕÇ][A-ZÁÉÍÓÚÃÕÇ0-9 /_-]{2,}:/.test(linha)) break;
      if (/^-{10,}$/.test(linha) || /^=+$/.test(linha)) break;
      if (linha) resultado.push(linha);
    }
    return resultado;
  }

  function campoTexto(bloco, nome) {
    return limparValor(linhasCampo(bloco, nome).join(" "));
  }

  function campoLista(bloco, nome) {
    return linhasCampo(bloco, nome)
      .join(" ")
      .split("|")
      .map((item) => limparValor(item))
      .filter(Boolean);
  }

  function extrairEntradas(bloco) {
    const linhas = linhasCampo(bloco, "POSSIVEIS ENTRADAS");
    return linhas
      .flatMap((linha) => linha.split(/\s*\|\s*/))
      .map((linha) => linha.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean)
      .map((textoEntrada) => {
        const oddMatch = textoEntrada.match(/(?:odd|preço|@)\s*[:=]?\s*([0-9]+(?:[.,][0-9]+)?)/i);
        const probMatch = textoEntrada.match(/(?:probabilidade|chance|—|-)\s*~?\s*(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)\s*%/i);
        const probabilidade = probMatch?.[1]?.replace(/\s+/g, "") || "";
        const mercado = textoEntrada
          .replace(/(?:odd|preço|@)\s*[:=]?\s*[0-9]+(?:[.,][0-9]+)?/i, "")
          .replace(/(?:probabilidade|chance|—|-)\s*~?\s*\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?\s*%/i, "")
          .replace(/\s*\|\s*/g, " ")
          .trim();
        return {
          mercado,
          odd: oddMatch?.[1]?.replace(",", ".") || "",
          probabilidade,
          texto: textoEntrada,
        };
      });
  }

  function separarBlocos() {
    return texto
      .split(/^\s*=+\s*$/m)
      .map((bloco) => bloco.trim())
      .filter(Boolean)
      .filter((bloco) => /^(?:ESPORTE:\s*|MLS\s*$|NFL\s*$)/im.test(bloco));
  }

  const jogos = [];

  function adicionarItem({
    esporteOriginal,
    jogo,
    liga,
    hora,
    local,
    contexto,
    estatisticas,
    entradasTexto,
    entradas,
    correcao,
    programa,
    jogosRelacionados,
    extraCampos = {},
    probabilidadeDireta = "",
    oddDireta = "",
    tendencia = "",
    placarProjetado = "",
    totalProjetado = "",
    indiceEvento = 0,
    totalEventos = 1,
  }) {
    if (!jogo) return;

    const horas = String(hora || "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);
    const horaDoItem =
      horas.length === totalEventos
        ? horas[indiceEvento]
        : horas[0] || hora;

    const item = {
      jogo: limparValor(jogo),
      principal: false,
      esporte: esporteCanonico(esporteOriginal),
      liga: limparValor(liga),
      hora: limparValor(horaDoItem).replace(/^.*?-\s*/i, "").trim(),
      noticia: limparValor(contexto) || limparValor(jogo),
      detalhe: "",
      transmissao: "",
      melhorOdd: "",
      risco: "",
      mercado: entradas?.[0]?.mercado || "",
      odd: oddDireta || entradas?.[0]?.odd || "",
      probabilidade: probabilidadeDireta || entradas?.[0]?.probabilidade || "",
      resumo: limparValor(contexto),
      oQuePesa: limparValor(correcao),
      leitura: limparValor(estatisticas),
      tendencia: limparValor(tendencia),
      placarProjetado: limparValor(placarProjetado),
      totalProjetado: limparValor(totalProjetado),
      entradas: entradas || [],
      mercados: entradasTexto || [],
      programa: limparValor(programa),
      jogosRelacionados: jogosRelacionados || [],
      extraCampos,
      extra: local ? ["Local: " + limparValor(local)] : [],
    };

    if (item.mercados.length === 0 && item.jogosRelacionados.length) {
      item.mercados = item.jogosRelacionados;
    }

    const chave = chaveJogo(item.jogo);
    if (!jogos.some((j) => chaveJogo(j.jogo) === chave)) {
      jogos.push(item);
    }
  }

  for (const bloco of separarBlocos()) {
    const linhasBloco = bloco.split("\n").map((l) => l.trim()).filter(Boolean);
    let esporteOriginal = "";
    const primeira = linhasBloco[0] || "";

    if (/^ESPORTE:/i.test(primeira)) {
      esporteOriginal = primeira.replace(/^ESPORTE:\s*/i, "").trim();
    } else if (/^MLS$/i.test(primeira) || /^NFL$/i.test(primeira)) {
      esporteOriginal = primeira;
    }

    const partida = campoTexto(bloco, "PARTIDA");
    const evento = campoTexto(bloco, "EVENTO");
    const eventos = campoLista(bloco, "EVENTOS");
    const nomePrincipal = partida || evento;
    const nomes = eventos.length ? eventos : [nomePrincipal];

    const liga = campoTexto(bloco, "COMPETICAO");
    const dataHora = campoTexto(bloco, "DATA/HORA");
    const local = campoTexto(bloco, "LOCAL");
    const contexto = campoTexto(bloco, "CONTEXTO");
    const estatisticas = campoTexto(bloco, "ESTATISTICAS E PROBABILIDADES") || campoTexto(bloco, "ESTATISTICAS");
    const tendencia = campoTexto(bloco, "TENDENCIA");
    const placarProjetado = campoTexto(bloco, "PLACAR PROJETADO");
    const totalProjetado = campoTexto(bloco, "TOTAL PROJETADO");
    const correcao = campoTexto(bloco, "CORRECAO") || campoTexto(bloco, "CORRECAO IMPORTANTE");
    const entradasTexto = campoLista(bloco, "POSSIVEIS ENTRADAS");
    const entradas = extrairEntradas(bloco);
    const probabilidadeDireta = campoTexto(bloco, "PROBABILIDADE ESTIMADA") || campoTexto(bloco, "PROBABILIDADE");
    const oddDireta = campoTexto(bloco, "ODD");
    const programa = campoTexto(bloco, "PROGRAMA DE SABADO");
    const jogosRelacionados = campoLista(bloco, "JOGOS");

    const extraCampos = {};
    const camposReconhecidos = new Set([
      "ESPORTE","PARTIDA","EVENTO","EVENTOS","COMPETICAO","DATA/HORA","LOCAL","CONTEXTO",
      "ESTATISTICAS E PROBABILIDADES","POSSIVEIS ENTRADAS","CORRECAO","CORRECAO IMPORTANTE",
      "PROBABILIDADE ESTIMADA","PROBABILIDADE","ODD","PROGRAMA DE SABADO","JOGOS"
    ]);
    for (const linha of linhasBloco) {
      const m = linha.match(/^([A-ZÁÉÍÓÚÃÕÇ0-9][A-ZÁÉÍÓÚÃÕÇ0-9 _/()\-]{1,80}):\s*(.*)$/);
      if (!m) continue;
      const chave = m[1].trim();
      if (camposReconhecidos.has(chave.toUpperCase())) continue;
      const chaveExtra = semAcentos(chave).toLowerCase().replace(/\s+/g, "_");
      extraCampos[chaveExtra] = extraCampos[chaveExtra]
        ? extraCampos[chaveExtra] + " " + m[2].trim()
        : m[2].trim();
    }

    if (!nomes.length || !nomes[0]) continue;

    nomes.forEach((nome, index) => {
      adicionarItem({
        esporteOriginal,
        jogo: nome,
        liga,
        hora: dataHora,
        local,
        contexto,
        estatisticas,
        entradasTexto,
        entradas,
        correcao,
        programa,
        probabilidadeDireta,
        oddDireta,
        jogosRelacionados,
        extraCampos,
        indiceEvento: index,
        totalEventos: nomes.length,
      });
    });
  }

  // O bloco MLS/NFL pode vir sem a chave ESPORTE no TXT.
  // Eles são preservados, mas a NFL de 20/09 não entra nos destaques de 19/09.
  const por = (nome) => jogos.filter((j) => j.esporte === nome);
  const marcar = (nome, quantidade) =>
    por(nome).slice(0, quantidade).forEach((j) => {
      j.principal = true;
    });

  const prioridadesFutebol = [
    "Sao Paulo x Internacional",
    "Sevilla x Barcelona",
    "Roma x Internazionale",
    "Brighton x Arsenal",
    "Stuttgart x Borussia Dortmund",
    "Tottenham x Aston Villa",
    "Atletico-MG x Chapecoense",
    "Vasco x Coritiba",
  ];

  const selecionadosFutebol = new Set();
  for (const nomePrioridade of prioridadesFutebol) {
    const alvo = por("Futebol").find((j) => chaveJogo(j.jogo) === chaveJogo(nomePrioridade));
    if (alvo) {
      alvo.principal = true;
      selecionadosFutebol.add(chaveJogo(alvo.jogo));
    }
  }

  if (selecionadosFutebol.size < Math.min(8, por("Futebol").length)) {
    for (const jogo of por("Futebol")) {
      if (selecionadosFutebol.size >= 8) break;
      if (!selecionadosFutebol.has(chaveJogo(jogo.jogo))) {
        jogo.principal = true;
        selecionadosFutebol.add(chaveJogo(jogo.jogo));
      }
    }
  }

  for (const nome of ["UFC", "NASCAR", "MLB", "NCAA", "Golfe", "AFL", "WNBA", "NHL", "MotoGP", "Tênis"]) {
    marcar(nome, 1);
  }
  for (const j of por("NFL")) j.principal = false;

  const esportes = [];
  for (const j of jogos) {
    if (j.principal && !esportes.includes(j.esporte)) {
      esportes.push(j.esporte);
    }
  }

  return {
    bruto: raw,
    manchete,
    geral: "Os principais eventos de hoje, reunidos por esporte. Abra um evento para ver contexto, estatísticas, probabilidades e mercados disponíveis no boletim.",
    jogos,
    esportes,
  };
}

export function parseBoletimTxt(raw) {
  if (/^ESPORTE:\s*/im.test(String(raw || ""))) return parseFormatoEsporte(raw);
  const texto = String(raw || "").replace(/\r/g, "");
  const linhas = texto.split("\n");
  const primeira = linhas.find((l) => l.trim()) || "Boletim do dia";
  const manchete = primeira.replace(/^NEWSLETTER[^\n—-]*[—-]\s*/i, "").trim() || primeira.trim();

  const antesPartes = (texto.split(/={5,}/)[0] || "");
  let geral = antesPartes
    .split("\n")
    .slice(1)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^NEWSLETTER/i.test(l))
    .join(" ");

  const parte1 = (texto.split(/PARTE\s*1/i)[1] || "").split(/PARTE\s*2/i)[0] || "";

  const compacto = [];
  if (!/PARTE\s*1/i.test(texto) && !/PARTE\s*2/i.test(texto)) {
    let esporteCompacto = "futebol";

    for (const linha of linhas.slice(1)) {
      const t = linha.trim();
      if (!t) continue;

      const secao = secaoDe(t);
      if (secao) {
        esporteCompacto = secao;
        continue;
      }

      const partes = t.split("|").map((x) => x.trim()).filter(Boolean);
      if (partes.length < 4) continue;

      const [jogo, hora, liga, mercado, odd, probabilidade] = partes;
      if (!jogo || !hora || !liga || !mercado) continue;

      const entrada = entradaCompacta(jogo, mercado, odd, probabilidade);
      compacto.push({
        ...entrada,
        esporte: esporteCompacto,
        liga,
        hora,
        noticia: "",
        detalhe: "",
        transmissao: "",
        melhorOdd: odd || "",
        risco: "",
        resumo: "",
        oQuePesa: "",
        leitura: "",
        extra: [],
      });
    }
  }

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

    const secao = secaoDe(t);
    if (secao) {
      flush();
      esporte = secao;
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

  if (compacto.length) {
    geral = linhas.slice(1).find((l) => {
      const t = l.trim();
      return t && !t.includes("|") && !secaoDe(t);
    })?.trim() || "";
  }

  const jogos = compacto.length ? [...compacto] : [...principais];
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
