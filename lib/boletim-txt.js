const CAMPOS = {
  manchete: ["manchete", "titulo", "título"],
  geral: ["geral", "abertura", "editorial"],
  esporte: ["esporte"],
  liga: ["liga", "campeonato"],
  jogo: ["jogo", "evento", "partida"],
  data: ["data", "dia"],
  hora: ["hora", "horario", "horário"],
  mercado: ["mercado", "palpite"],
  odd: ["odd"],
  principal: ["principal", "destaque"],
  noticia: ["noticia", "notícia", "news"],
  detalhe: ["detalhe", "detalhamento", "analise", "análise", "motivo"],
};

function chave(nome) {
  const n = String(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  for (const [campo, aliases] of Object.entries(CAMPOS)) {
    if (aliases.some((alias) => alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === n)) return campo;
  }
  return null;
}

function sim(valor) {
  return /^(sim|yes|true|1|principal|destaque)$/i.test(String(valor || "").trim());
}

export function parseBoletimTxt(raw) {
  const linhas = String(raw || "").split(/\r?\n/);
  const jogos = [];
  let manchete = "";
  let geral = "";
  let atual = {};
  let bloco = null;
  let buffer = [];

  function soltarBuffer() {
    const texto = buffer.join("\n").trim();
    buffer = [];
    if (!texto) return;
    if (bloco === "manchete") manchete = texto;
    else if (bloco === "geral") geral = texto;
    else if (bloco && atual) atual[bloco] = texto;
  }

  function fecharJogo() {
    soltarBuffer();
    if (atual.jogo || atual.mercado) {
      atual.principal = sim(atual.principal) || atual.principal === true;
      jogos.push(atual);
    }
    atual = {};
    bloco = null;
  }

  for (const linhaBruta of linhas) {
    const linha = linhaBruta.trim();
    if (/^---+$/.test(linha)) {
      fecharJogo();
      continue;
    }
    const match = linha.match(/^([^:]+):\s*(.*)$/);
    if (match && chave(match[1])) {
      soltarBuffer();
      const campo = chave(match[1]);
      const valor = match[2];
      if (campo === "manchete" || campo === "geral") {
        bloco = campo;
        if (valor) buffer.push(valor);
        continue;
      }
      if (campo === "esporte" && (atual.jogo || atual.mercado || atual.noticia)) fecharJogo();
      if (campo === "jogo" && atual.jogo) fecharJogo();
      atual[campo] = valor;
      bloco = ["noticia", "detalhe"].includes(campo) && !valor ? campo : null;
      continue;
    }
    if (linha) buffer.push(linhaBruta.trimEnd());
  }
  fecharJogo();
  if (!manchete && buffer.length) manchete = buffer.join(" ");
  const esportes = [...new Set(jogos.map((j) => j.esporte).filter(Boolean))];
  return { bruto: raw, manchete, geral, jogos, esportes };
}
