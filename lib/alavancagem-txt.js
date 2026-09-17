const CAMPOS = {
  nivel: ["nivel", "nível", "risco"],
  meta: ["meta", "alavancagem", "multiplicador", "alvo"],
  esporte: ["esporte"],
  liga: ["liga", "campeonato"],
  jogo: ["jogo", "evento", "partida"],
  data: ["data", "dia"],
  hora: ["hora", "horario", "horário"],
  odd: ["odd", "odd_base", "odd base"],
  mercado: ["mercado", "palpite"],
  motivo: ["motivo", "obs", "observacao", "observação"],
};

function chaveCampo(nome) {
  const n = String(nome || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (n.startsWith("meta_")) return "meta_nivel";
  for (const [campo, aliases] of Object.entries(CAMPOS)) {
    if (aliases.some((alias) => alias.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === n)) return campo;
  }
  return null;
}

function nivelId(valor) {
  const n = String(valor || "").toLowerCase();
  if (/(baixo|baixa|segura|low)/.test(n)) return "segura";
  if (/(medio|media|médio|média)/.test(n)) return "media";
  if (/(alto|alta|high)/.test(n)) return "alta";
  return null;
}

export function parseAlavancagemTxt(raw) {
  const linhas = String(raw || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha && !linha.startsWith("#"));
  const eventos = [];
  const metas = { segura: null, media: null, alta: null };
  let atual = {};
  let nivelAtual = null;
  function fechar() {
    if (atual.jogo || atual.mercado || atual.odd) {
      atual.nivel = nivelId(atual.nivel) || nivelAtual || "media";
      if (atual.meta && !metas[atual.nivel]) metas[atual.nivel] = atual.meta;
      eventos.push(atual);
    } else if (atual.meta && (nivelId(atual.nivel) || nivelAtual)) {
      metas[nivelId(atual.nivel) || nivelAtual] = atual.meta;
    }
    atual = { nivel: nivelAtual };
  }
  for (const linha of linhas) {
    if (/^---+$/.test(linha)) {
      fechar();
      continue;
    }
    const match = linha.match(/^([^:]+):\s*(.+)$/);
    if (!match) continue;
    const campoBruto = match[1].trim();
    const valor = match[2].trim();
    const campo = chaveCampo(campoBruto);
    if (campo === "meta_nivel") {
      const id = nivelId(campoBruto.replace(/^meta_+/i, ""));
      if (id) metas[id] = valor;
      continue;
    }
    if (!campo) continue;
    if (campo === "nivel") {
      if (atual.jogo || atual.odd || atual.mercado) fechar();
      nivelAtual = nivelId(valor);
      atual.nivel = valor;
      continue;
    }
    atual[campo] = valor;
    if (campo === "meta" && nivelAtual) metas[nivelAtual] = valor;
  }
  fechar();
  const niveis = { segura: [], media: [], alta: [] };
  for (const evento of eventos) {
    (niveis[evento.nivel] || niveis.media).push(evento);
  }
  return { bruto: raw, eventos, niveis, metas };
}
