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

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function chaveCampo(nome) {
  const n = normalizar(nome);
  if (n.startsWith("meta_")) return "meta_nivel";
  for (const [campo, aliases] of Object.entries(CAMPOS)) {
    if (aliases.some((alias) => normalizar(alias) === n)) return campo;
  }
  return null;
}

function nivelId(valor) {
  const n = normalizar(valor);
  if (/(baixo|baixa|segura|low)/.test(n)) return "segura";
  if (/(medio|media)/.test(n)) return "media";
  if (/(alto|alta|high)/.test(n)) return "alta";
  return null;
}

function parseEventoComSeparador(linha, nivelAtual) {
  const partes = linha.split("|").map((p) => p.trim());
  if (partes.length < 4) return null;

  const [cabeca, esporte, jogo, mercado, odd, ...extras] = partes;
  const dataHora = cabeca.split(/\s+/);
  const data = dataHora[0] || "";
  const hora = dataHora[1] || "";
  const oddNum = Number(String(odd || "").replace(",", "."));

  if (!jogo) return null;

  return {
    nivel: nivelAtual,
    data,
    hora,
    esporte: esporte || "",
    liga: "",
    jogo,
    mercado: mercado || "",
    odd: Number.isFinite(oddNum) && oddNum > 0 ? oddNum : (odd || ""),
    motivo: extras.join(" | "),
  };
}

export function parseAlavancagemTxt(raw) {
  const texto = String(raw || "");
  const linhas = texto
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

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
    // Formato semanal: "# BAIXO", "# MEDIO", "# ALTO".
    if (linha.startsWith("#")) {
      const id = nivelId(linha.replace(/^#+/, "").trim());
      if (id) {
        fechar();
        nivelAtual = id;
        atual = { nivel: nivelAtual };
      }
      continue;
    }

    // Cabeçalhos semanais como "BAIXO 4", "MEDIO 7", "ALTO 12".
    const headerX = linha.match(/^(baixo|baixa|seguro|segura|medio|médio|media|média|alto|alta)\s*[:=\-]?\s*(\d+(?:[.,]\d+)?)\s*x?$/i);
    if (headerX) {
      const id = nivelId(headerX[1]);
      if (id) metas[id] = headerX[2];
      continue;
    }

    // Evento no formato semanal:
    // data hora | esporte | jogo | mercado | odd | motivo
    if (linha.includes("|") && nivelAtual) {
      const evento = parseEventoComSeparador(linha, nivelAtual);
      if (evento) {
        eventos.push(evento);
      }
      continue;
    }

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
    const nivel = nivelId(evento.nivel) || nivelAtual || "media";
    evento.nivel = nivel;
    niveis[nivel].push(evento);
  }

  return { bruto: raw, eventos, niveis, metas };
}
