const MODELS = [
  process.env.GEMINI_BETTING_VISION_MODEL || "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite"
].filter((model, index, list) => model && list.indexOf(model) === index);

const nullableString = { type: "string", nullable: true };
const nullableNumber = { type: "number", nullable: true };

const schema = {
  type: "object",
  properties: {
    versao: { type: "string" },
    origem: { type: "string" },
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

const INSTRUCTIONS = `Você é o leitor visual especializado de comprovantes de apostas esportivas do Gestão Banca.

OBJETIVO PRINCIPAL:
Analise TODAS as imagens recebidas como partes de UM ÚNICO bilhete. Nunca trate imagens diferentes como apostas diferentes. Una informações complementares entre os prints e produza sempre o mesmo contrato JSON.

LEITURA VISUAL:
- Não faça apenas OCR literal. Primeiro entenda a hierarquia visual da tela: casa, cabeçalhos, esporte, competição, evento, mercado, seleção, odd, valor, status e identificadores.
- Preserve exatamente os textos visíveis. Não invente nomes, não complete nomes de times, não troque abreviações e não transforme um texto parcialmente legível em algo plausível.
- Se um dado não estiver visível ou estiver ilegível, use null e registre o problema em avisos.
- Se houver várias pernas, crie uma perna para CADA evento/seleção realmente identificável, na ordem visual quando possível.
- Não descarte uma perna porque outra imagem contém dados complementares.

ESPORTE — REGRA OBRIGATÓRIA:
- Identifique o esporte explicitamente sempre que houver evidência visual suficiente.
- Exemplos: futebol, futebol americano (NFL), basquete, tênis, beisebol, hóquei, vôlei, MMA, boxe, automobilismo e eSports.
- Se aparecer NFL, logo NFL, American Football ou outro indicador inequívoco, use exatamente "futebol americano".
- Não use "futebol" para NFL.
- Se houver evidência de uma liga/equipe específica que permita identificar o esporte, use essa evidência; se não houver evidência suficiente, use null e avise.

ODDS E NÚMEROS — REGRA OBRIGATÓRIA:
- Preserve TODA a precisão numérica visível. Nunca arredonde uma odd para duas casas.
- Se o print mostrar 1,122222, retorne 1.122222. Se mostrar 1,12, retorne 1.12.
- O número de casas deve refletir o que está realmente visível.
- Não transforme 1,122222 em 1,12, não trunque e não arredonde.
- Não calcule uma odd individual ausente.
- Se odd total e odds das pernas estiverem visíveis, compare a multiplicação apenas como validação e avise em caso de divergência.

DATA E HORA:
- Transcreva a data/hora visível, inclusive formatos como DD/MM/YYYY - HH:mm.
- A aplicação normalizará o valor para timestamp antes de salvar.

RESULTADO:
- Detecte green, red, anulada ou cashout somente com evidência clara.
- Em cashout, valor_resgatado é o valor recebido no encerramento antecipado.
- status_detectado é apenas a leitura do print; status_usuario será confirmado pelo usuário.

CONFIANÇA:
- confianca entre 0 e 1, refletindo a qualidade real da leitura.
- avisos devem indicar dados ausentes, ambíguos, cortados, ilegíveis ou inconsistentes.

Retorne SOMENTE o JSON conforme o schema. Nunca escreva texto fora do JSON.`;

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

async function chamarGemini(model, input) {
  return fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      model,
      input,
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema
      }
    })
  });
}

function deveTentarOutroModelo(status) {
  return [429, 500, 502, 503, 504].includes(status);
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
  for (const model of MODELS) {
    const response = await chamarGemini(model, input);
    if (!response.ok) {
      lastDetail = await response.text();
      if (deveTentarOutroModelo(response.status)) continue;
      throw new Error(`Falha no leitor Gemini (${response.status}): ${lastDetail.slice(0, 500)}`);
    }

    const data = await response.json();
    const output = textoResposta(data);
    if (!output) throw new Error(`O Gemini (${model}) não retornou dados estruturados.`);

    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch {
      throw new Error(`O Gemini (${model}) retornou uma resposta JSON inválida.`);
    }

    return normalizarLeitura(parsed, model);
  }

  throw new Error(`O serviço Gemini está temporariamente com alta demanda ou limite de requisições. Tente novamente em alguns segundos. Detalhe: ${lastDetail.slice(0, 300)}`);
}

function normalizarDataHora(valor) {
  if (!valor || typeof valor !== "string") return valor || null;
  const texto = valor.trim();
  const match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s*[-–—]?\s*)(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return valor;

  let [, dia, mes, ano, hora, minuto, segundo] = match;
  if (ano.length === 2) ano = Number(ano) >= 70 ? `19${ano}` : `20${ano}`;
  const d = Number(dia), m = Number(mes), h = Number(hora), min = Number(minuto), s = Number(segundo || 0);
  const data = new Date(Date.UTC(Number(ano), m - 1, d, h, min, s));
  if (data.getUTCFullYear() !== Number(ano) || data.getUTCMonth() !== m - 1 || data.getUTCDate() !== d || h > 23 || min > 59 || s > 59) {
    return valor;
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${ano}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}:${pad(s)}-03:00`;
}

function normalizarLeitura(data, model) {
  const pernas = Array.isArray(data.pernas) ? data.pernas.map((p, i) => ({
    ordem: Number.isFinite(Number(p.ordem)) ? Number(p.ordem) : i + 1,
    jogo: p.jogo || null,
    selecao: p.selecao || null,
    mercado: p.mercado || null,
    odd_perna: p.odd_perna == null ? null : Number(p.odd_perna),
    placar_print: p.placar_print || null,
    status_print: p.status_print || "desconhecido",
    confianca: Math.max(0, Math.min(1, Number(p.confianca || 0))),
    avisos: Array.isArray(p.avisos) ? p.avisos : []
  })) : [];

  const result = {
    ...data,
    versao: "3.0",
    origem: model,
    data_hora: normalizarDataHora(data.data_hora),
    status_usuario: "pendente",
    pernas,
    avisos: Array.isArray(data.avisos) ? data.avisos : []
  };

  if (data.data_hora && result.data_hora === data.data_hora && /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(data.data_hora)) {
    result.avisos.push("A data/hora foi lida, mas não pôde ser convertida automaticamente para timestamp.");
  }

  if (result.status_detectado === "cashout" && result.valor_resgatado == null) {
    result.avisos.push("O comprovante indica cashout, mas o valor resgatado não foi identificado.");
  }

  return result;
}
