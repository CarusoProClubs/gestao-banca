const CAMPOS = {
  nivel: ["nivel", "nível", "risco"],
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
  return "media";
}

export function parseAlavancagemTxt(raw) {
  const linhas = String(raw || "")
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha && !linha.startsWith("#"));
  const eventos = [];
  let atual = {};
  function fechar() {
    if (atual.jogo || atual.mercado || atual.odd) {
      atual.nivel = nivelId(atual.nivel);
      eventos.push(atual);
    }
    atual = {};
  }
  for (const linha of linhas) {
    if (/^---+$/.test(linha)) {
      fechar();
      continue;
    }
    const match = linha.match(/^([^:]+):\s*(.+)$/);
    if (!match) continue;
    const campo = chaveCampo(match[1]);
    if (!campo) continue;
    if (campo === "nivel" && (atual.jogo || atual.odd || atual.mercado)) fechar();
    atual[campo] = match[2].trim();
  }
  fechar();
  const niveis = { segura: [], media: [], alta: [] };
  for (const evento of eventos) {
    (niveis[evento.nivel] || niveis.media).push(evento);
  }
  return { bruto: raw, eventos, niveis };
}
