const MODELS = [
  process.env.GEMINI_BETTING_VISION_MODEL || "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite"
].filter((model, index, list) => model && list.indexOf(model) === index);

const VALIDATION_SCHEMA = {
  type: "object",
  properties: {
    pernas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ordem: { type: "integer" },
          status: { type: "string", enum: ["green", "red", "anulada", "pendente", "desconhecido"] },
          confianca: { type: "number", minimum: 0, maximum: 1 },
          justificativa: { type: "string" }
        },
        required: ["ordem", "status", "confianca", "justificativa"]
      }
    },
    status_bilhete: { type: "string", enum: ["green", "red", "anulada", "pendente", "desconhecido"] },
    confianca: { type: "number", minimum: 0, maximum: 1 },
    avisos: { type: "array", items: { type: "string" } }
  },
  required: ["pernas", "status_bilhete", "confianca", "avisos"]
};

function normalizarTexto(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dataDaLeitura(dataHora) {
  if (!dataHora) return null;
  const match = String(dataHora).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const br = String(dataHora).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!br) return null;
  let ano = br[3];
  if (ano.length === 2) ano = Number(ano) >= 70 ? `19${ano}` : `20${ano}`;
  return `${ano}-${String(br[2]).padStart(2, "0")}-${String(br[1]).padStart(2, "0")}`;
}

function eventoBusca(jogo) {
  const partes = String(jogo || "")
    .replace(/\s+(vs\.?|v)\s+/gi, " vs ")
    .split(/\s+vs\s+|\s+x\s+/i)
    .map((item) => item.trim())
    .filter(Boolean);
  if (partes.length >= 2) return `${partes[0]}_vs_${partes[1]}`;
  return String(jogo || "").trim().replace(/\s+/g, "_");
}

async function buscarEvento(perna, dataEvento) {
  if (!perna?.jogo) return { encontrado: false, motivo: "Jogo não identificado." };
  const termo = eventoBusca(perna.jogo);
  const params = new URLSearchParams({ e: termo });
  if (dataEvento) params.set("d", dataEvento);
  const url = `https://www.thesportsdb.com/api/v1/json/123/searchevents.php?${params.toString()}`;

  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) return { encontrado: false, motivo: `Fonte esportiva respondeu HTTP ${response.status}.` };
  const data = await response.json();
  const events = Array.isArray(data?.event) ? data.event : [];
  if (!events.length) return { encontrado: false, motivo: "Evento não encontrado na fonte esportiva." };

  const alvo = normalizarTexto(perna.jogo);
  const selecionado = events.find((event) => {
    const nome = normalizarTexto(event.strEvent);
    return alvo && (nome.includes(alvo) || alvo.includes(nome));
  }) || events[0];

  if (!selecionado?.idEvent) return { encontrado: false, motivo: "A fonte retornou o evento sem identificador." };

  const detalhesUrl = `https://www.thesportsdb.com/api/v1/json/123/lookupevent.php?id=${encodeURIComponent(selecionado.idEvent)}`;
  const statsUrl = `https://www.thesportsdb.com/api/v1/json/123/lookupeventstats.php?id=${encodeURIComponent(selecionado.idEvent)}`;
  const timelineUrl = `https://www.thesportsdb.com/api/v1/json/123/lookuptimeline.php?id=${encodeURIComponent(selecionado.idEvent)}`;

  const [detalhesResponse, statsResponse, timelineResponse] = await Promise.all([
    fetch(detalhesUrl, { cache: "no-store" }),
    fetch(statsUrl, { cache: "no-store" }),
    fetch(timelineUrl, { cache: "no-store" })
  ]);

  const detalhes = detalhesResponse.ok ? await detalhesResponse.json() : {};
  const stats = statsResponse.ok ? await statsResponse.json() : {};
  const timeline = timelineResponse.ok ? await timelineResponse.json() : {};
  const event = Array.isArray(detalhes?.events) && detalhes.events.length ? detalhes.events[0] : selecionado;

  return {
    encontrado: true,
    fonte: "TheSportsDB",
    evento: {
      id: event.idEvent || selecionado.idEvent,
      nome: event.strEvent || selecionado.strEvent || null,
      esporte: event.strSport || selecionado.strSport || null,
      liga: event.strLeague || selecionado.strLeague || null,
      data: event.dateEvent || selecionado.dateEvent || null,
      hora: event.strTime || selecionado.strTime || null,
      status: event.strStatus || selecionado.strStatus || null,
      placar_casa: event.intHomeScore ?? selecionado.intHomeScore ?? null,
      placar_fora: event.intAwayScore ?? selecionado.intAwayScore ?? null,
      time_casa: event.strHomeTeam || selecionado.strHomeTeam || null,
      time_fora: event.strAwayTeam || selecionado.strAwayTeam || null
    },
    estatisticas: Array.isArray(stats?.eventstats) ? stats.eventstats : [],
    timeline: Array.isArray(timeline?.timeline) ? timeline.timeline : []
  };
}

function textoResposta(data) {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  return steps.flatMap((step) => Array.isArray(step?.content) ? step.content : [])
    .map((part) => part?.text || "")
    .join("")
    .trim();
}

function deveTentarOutroModelo(status) {
  return [429, 500, 502, 503, 504].includes(status);
}

async function validarComGemini(bilhete, evidencias) {
  const input = `Você é o validador de resultados do Gestão Banca.\n\nAnalise o bilhete e as evidências esportivas fornecidas. Determine o status de CADA perna.\n\nREGRAS CRÍTICAS:\n- Nunca invente resultado ou estatística ausente.\n- Só marque green/red/anulada quando a evidência externa for suficiente para avaliar exatamente o mercado e a seleção.\n- Se o evento não puder ser identificado com segurança, use "desconhecido".\n- Se o evento ainda estiver em andamento ou não houver dados finais suficientes, use "pendente".\n- Respeite o esporte e as regras do mercado. NFL/American Football = futebol americano.\n- Para handicap/spread, over/under, vencedor e mercados equivalentes, faça a conta explicitamente antes de decidir.\n- Para props de jogadores, use estatísticas/eventos fornecidos; não estime.\n- Um cashout visível no print não deve ser substituído por green/red.\n- O status_bilhete só pode ser green se todas as pernas estiverem green/anulada; red se alguma perna estiver red; anulada se todas estiverem anuladas; caso contrário pendente.\n\nBILHETE:\n${JSON.stringify(bilhete, null, 2)}\n\nEVIDÊNCIAS EXTERNAS:\n${JSON.stringify(evidencias, null, 2)}\n\nRetorne somente JSON conforme o schema.`;

  let lastDetail = "";
  for (const model of MODELS) {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        model,
        input,
        response_format: { type: "text", mime_type: "application/json", schema: VALIDATION_SCHEMA }
      })
    });

    if (!response.ok) {
      lastDetail = await response.text();
      if (deveTentarOutroModelo(response.status)) continue;
      throw new Error(`Falha na validação Gemini (${response.status}): ${lastDetail.slice(0, 300)}`);
    }

    const data = await response.json();
    const output = textoResposta(data);
    try {
      return JSON.parse(output);
    } catch {
      throw new Error(`A validação Gemini retornou JSON inválido.`);
    }
  }
  throw new Error(`Validação Gemini indisponível: ${lastDetail.slice(0, 300)}`);
}

function passado(dataHora) {
  const data = dataDaLeitura(dataHora);
  if (!data) return false;
  return new Date(`${data}T23:59:59-03:00`).getTime() < Date.now();
}

export async function validarResultadosBilhete(bilhete) {
  if (!bilhete?.pernas?.length) return bilhete;
  if (!passado(bilhete.data_hora)) return bilhete;
  if (!process.env.GEMINI_API_KEY) return bilhete;

  const dataEvento = dataDaLeitura(bilhete.data_hora);
  const evidencias = [];
  const avisos = Array.isArray(bilhete.avisos) ? [...bilhete.avisos] : [];

  for (const perna of bilhete.pernas) {
    try {
      evidencias.push({ ordem: perna.ordem, ...await buscarEvento(perna, dataEvento) });
    } catch (error) {
      evidencias.push({ ordem: perna.ordem, encontrado: false, motivo: error instanceof Error ? error.message : "Falha na consulta esportiva." });
    }
  }

  const encontrados = evidencias.filter((item) => item.encontrado);
  if (!encontrados.length) {
    avisos.push("A validação automática foi tentada, mas nenhum evento pôde ser confirmado na fonte esportiva.");
    return { ...bilhete, avisos };
  }

  try {
    const validacao = await validarComGemini(bilhete, evidencias);
    const porOrdem = new Map((validacao.pernas || []).map((item) => [Number(item.ordem), item]));
    const pernas = bilhete.pernas.map((perna) => {
      const item = porOrdem.get(Number(perna.ordem));
      if (!item) return perna;
      const status = item.status;
      return {
        ...perna,
        status_print: status === "green" ? "acertou" : status === "red" ? "errou" : status === "anulada" ? "anulada" : "desconhecido",
        avisos: [
          ...(Array.isArray(perna.avisos) ? perna.avisos : []),
          item.justificativa ? `Validação automática: ${item.justificativa}` : ""
        ].filter(Boolean)
      };
    });

    const statuses = pernas.map((perna) => perna.status_print);
    let status_detectado = "pendente";
    if (statuses.some((status) => status === "errou")) status_detectado = "red";
    else if (statuses.length && statuses.every((status) => status === "anulada")) status_detectado = "anulada";
    else if (statuses.length && statuses.every((status) => status === "acertou" || status === "anulada")) status_detectado = "green";

    return {
      ...bilhete,
      pernas,
      status_detectado,
      avisos: [...avisos, ...(Array.isArray(validacao.avisos) ? validacao.avisos : [])]
    };
  } catch (error) {
    avisos.push(`A validação automática não pôde ser concluída: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    return { ...bilhete, avisos };
  }
}
