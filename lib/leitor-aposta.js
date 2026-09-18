const MODELS = [
  process.env.GEMINI_BETTING_VISION_MODEL || "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite"
].filter((model, index, list) => model && list.indexOf(model) === index);

const nullableString = { type: ["string", "null"] };
const nullableNumber = { type: ["number", "null"] };

const schema = {
  type: "object",
  properties: {
    versao: { type: "string" },
    origem: nullableString,
    documento_valido: { type: "boolean" },
    motivo_invalido: nullableString,
    casa: nullableString,
    id_casa: nullableString,
    codigo_booking: nullableString,
    data_hora: nullableString,
    tipo: nullableString,
    formato: nullableString,
    titulo: nullableString,
    valor_apostado: nullableNumber,
    moeda: { type: "string" },
    odd_bilhete: nullableNumber,
    retorno_casa: nullableNumber,
    valor_resgatado: nullableNumber,
    status_detectado: { type: "string", enum: ["pendente", "green", "red", "anulada", "cashout", "desconhecido"] },
    esporte: nullableString,
    jogo: nullableString,
    pernas: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ordem: { type: "integer" },
          jogo: nullableString,
          selecao: nullableString,
          mercado: nullableString,
          odd_perna: nullableNumber,
          placar_print: nullableString,
          status_print: { type: "string", enum: ["acertou", "errou", "anulada", "desconhecido"] },
          confianca: { type: "number" },
          avisos: { type: "array", items: { type: "string" } }
        },
        required: ["ordem", "jogo", "selecao", "mercado", "odd_perna", "placar_print", "status_print", "confianca", "avisos"]
      }
    },
    confianca: { type: "number" },
    avisos: { type: "array", items: { type: "string" } }
  },
  required: [
    "versao", "origem", "documento_valido", "motivo_invalido", "casa", "id_casa",
    "codigo_booking", "data_hora", "tipo", "formato", "titulo", "valor_apostado",
    "moeda", "odd_bilhete", "retorno_casa", "valor_resgatado", "status_detectado",
    "esporte", "jogo", "pernas", "confianca", "avisos"
  ]
};

const INSTRUCTIONS = `Você é o extrator visual do Gestão Banca. Sua única função nesta etapa é DESCREVER O QUE ESTÁ VISÍVEL nas imagens.

Todas as imagens recebidas pertencem a UM ÚNICO bilhete. Una informações complementares entre elas.

REGRAS:
- Leia semanticamente a tela, mas não complete informações ausentes.
- Preserve exatamente nomes, abreviações, números e textos visíveis.
- Se algo estiver ilegível, cortado ou ausente, use null e registre aviso.
- Identifique TODAS as pernas/eventos realmente visíveis.
- NFL/American Football deve ser "futebol americano", nunca "futebol".
- Não invente esporte quando não houver evidência suficiente.
- Preserve a precisão visível das odds. 1,122222 vira 1.122222; 1,12 vira 1.12.
- Não calcule uma odd ausente.
- Transcreva a data/hora exatamente como aparece. Se não houver ano, NÃO invente ano.
- status_detectado só deve ser green/red/anulada/cashout quando houver evidência visual clara; caso contrário, pendente ou desconhecido.
- valor_resgatado é o valor efetivamente recebido no cashout, se estiver visível.
- confianca é apenas uma indicação da qualidade da leitura, não uma garantia.
- Retorne SOMENTE JSON conforme o schema.`;

function mimeType(file) {
  const type = file.type || "";
  if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type)) return type;
  throw new Error(`Formato de imagem não suportado: ${type || file.name}`);
}

function textoResposta(data) {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  const steps = Array.isArray(data?.steps) ? data.steps : [];
  return steps.flatMap((step) => Array.isArray(step?.content) ? step.content : [])
    .map((part) => part?.text || "")
    .join("")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function chamarGemini(model, input, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        model,
        input,
        response_format: { type: "text", mime_type: "application/json", schema }
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

function deveTentarOutroModelo(status) {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

function numeroOuNull(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizarLeitura(data, model) {
  const avisos = Array.isArray(data?.avisos) ? [...data.avisos] : [];
  const pernas = Array.isArray(data?.pernas) ? data.pernas.map((p, i) => ({
    ordem: Number.isFinite(Number(p?.ordem)) && Number(p.ordem) > 0 ? Number(p.ordem) : i + 1,
    jogo: p?.jogo || null,
    selecao: p?.selecao || null,
    mercado: p?.mercado || null,
    odd_perna: numeroOuNull(p?.odd_perna),
    placar_print: p?.placar_print || null,
    status_print: ["acertou", "errou", "anulada", "desconhecido"].includes(p?.status_print) ? p.status_print : "desconhecido",
    confianca: Math.max(0, Math.min(1, Number(p?.confianca) || 0)),
    avisos: Array.isArray(p?.avisos) ? p.avisos : []
  })) : [];

  const dataHoraOriginal = typeof data?.data_hora === "string" ? data.data_hora.trim() : null;
  const dataHoraNormalizada = normalizarDataHora(dataHoraOriginal);
  const result = {
    ...data,
    versao: "3.0",
    origem: model,
    valor_apostado: numeroOuNull(data?.valor_apostado),
    odd_bilhete: numeroOuNull(data?.odd_bilhete),
    retorno_casa: numeroOuNull(data?.retorno_casa),
    valor_resgatado: numeroOuNull(data?.valor_resgatado),
    data_hora: dataHoraNormalizada,
    status_usuario: "pendente",
    pernas,
    avisos
  };

  if (dataHoraOriginal && !dataHoraNormalizada) {
    result.avisos.push(`A data/hora "${dataHoraOriginal}" não pôde ser convertida automaticamente. Confirme-a antes de salvar.`);
  } else if (dataHoraOriginal && dataHoraNormalizada !== dataHoraOriginal && !/\d{4}/.test(dataHoraOriginal)) {
    result.avisos.push(`A data/hora "${dataHoraOriginal}" não exibia o ano. O sistema NÃO inferiu o ano; confirme a data completa antes de salvar.`);
  }

  if (result.status_detectado === "cashout" && result.valor_resgatado == null) {
    result.avisos.push("O comprovante indica cashout, mas o valor resgatado não foi identificado.");
  }

  if (result.odd_bilhete != null && result.valor_apostado != null && result.retorno_casa != null && result.valor_apostado > 0) {
    const implied = result.retorno_casa / result.valor_apostado;
    const diff = Math.abs(implied - result.odd_bilhete);
    if (diff > 0.02) {
      result.avisos.push(`A odd exibida (${result.odd_bilhete}) e o retorno implicam valores diferentes. Confira os valores antes de salvar.`);
    }
  }

  return result;
}

export async function interpretarBilhete(files) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada no servidor.");
  if (!files?.length) throw new Error("Nenhuma imagem foi enviada.");
  if (files.length > 8) throw new Error("Envie no máximo 8 imagens por bilhete.");

  const input = [{ type: "text", text: INSTRUCTIONS }];
  for (const file of files) {
    const type = mimeType(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 12 * 1024 * 1024) throw new Error(`A imagem ${file.name} excede 12 MB.`);
    input.push({ type: "image", data: buffer.toString("base64"), mime_type: type });
  }

  let lastDetail = "";
  for (let index = 0; index < MODELS.length; index += 1) {
    const model = MODELS[index];
    try {
      const response = await chamarGemini(model, input);
      if (!response.ok) {
        lastDetail = await response.text();
        if (deveTentarOutroModelo(response.status) && index < MODELS.length - 1) {
          await sleep(150);
          continue;
        }
        throw new Error(`Falha no leitor Gemini (${response.status}): ${lastDetail.slice(0, 500)}`);
      }

      const data = await response.json();
      const output = textoResposta(data);
      if (!output) throw new Error(`O Gemini (${model}) não retornou dados estruturados.`);

      let parsed;
      try {
        parsed = JSON.parse(output);
      } catch {
        throw new Error(`O Gemini (${model}) retornou JSON inválido.`);
      }

      return normalizarLeitura(parsed, model);
    } catch (error) {
      if (index < MODELS.length - 1 && (error?.name === "AbortError" || /temporariamente|timeout/i.test(error?.message || ""))) {
        await sleep(150);
        continue;
      }
      throw error;
    }
  }

  throw new Error("Não foi possível concluir a leitura do bilhete.");
}

const MESES = {
  jan: 0, janeiro: 0,
  feb: 1, fev: 1, fevereiro: 1,
  mar: 2, marco: 2, março: 2,
  apr: 3, abr: 3, abril: 3,
  may: 4, mai: 4, maio: 4,
  jun: 5, junho: 5,
  jul: 6, julho: 6,
  aug: 7, ago: 7, agosto: 7,
  sep: 8, set: 8, setembro: 8,
  oct: 9, out: 9, outubro: 9,
  nov: 10, novembro: 10,
  dec: 11, dez: 11, dezembro: 11
};

function normalizarDataHora(valor) {
  if (!valor || typeof valor !== "string") return null;
  const texto = valor.trim();

  const completo = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s*[-–—]?\s*)(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (completo) {
    let [, dia, mes, ano, hora, minuto, segundo] = completo;
    if (ano.length === 2) ano = Number(ano) >= 70 ? `19${ano}` : `20${ano}`;
    return montarTimestamp(ano, Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo || 0));
  }

  const abreviado = texto.match(/^(?:(?:domingo|segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|dom|seg|ter|qua|qui|sex|sáb|sab)\s+)?(\d{1,2})\s+([A-Za-zÀ-ÿ]+)(?:\s+(\d{4}))?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/i);
  if (abreviado) {
    const dia = Number(abreviado[1]);
    const mes = MESES[abreviado[2].toLowerCase()];
    const ano = abreviado[3] ? Number(abreviado[3]) : null;
    const hora = Number(abreviado[4]);
    const minuto = Number(abreviado[5]);
    const segundo = Number(abreviado[6] || 0);
    if (mes == null) return null;
    if (!ano) return null;
    return montarTimestamp(ano, mes, dia, hora, minuto, segundo);
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(texto)) {
    const parsed = new Date(texto);
    return Number.isNaN(parsed.getTime()) ? null : texto;
  }

  return null;
}

function montarTimestamp(ano, mes, dia, hora, minuto, segundo) {
  const y = Number(ano), m = Number(mes), d = Number(dia), h = Number(hora), min = Number(minuto), s = Number(segundo);
  if (![y, m, d, h, min, s].every(Number.isFinite)) return null;
  if (h > 23 || min > 59 || s > 59) return null;
  const data = new Date(Date.UTC(y, m, d, h, min, s));
  if (data.getUTCFullYear() !== y || data.getUTCMonth() !== m || data.getUTCDate() !== d) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${y}-${pad(m + 1)}-${pad(d)}T${pad(h)}:${pad(min)}:${pad(s)}-03:00`;
}
