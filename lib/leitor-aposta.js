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
- Se um dado não estiver visível ou estiver ilegível, use null e registre o problema em avisos/campos incertos.
- Se houver várias pernas, crie uma perna para CADA evento/seleção realmente identificável, na ordem visual quando possível.
- Não descarte uma perna porque outra imagem contém dados complementares.

ESPORTE — REGRA OBRIGATÓRIA:
- Identifique o esporte explicitamente sempre que houver evidência visual suficiente.
- Exemplos válidos: futebol, futebol americano (NFL), basquete, tênis, beisebol, hóquei, vôlei, MMA, boxe, automobilismo, eSports etc.
- Se aparecer NFL, NFL logo, American Football, nomes claramente associados a uma partida da NFL ou outro indicador inequívoco, use "futebol americano".
- Não use "futebol" para NFL. Futebol brasileiro e futebol americano são esportes diferentes.
- Se não houver evidência suficiente, use null e explique o motivo; nunca chute.

ODDS E NÚMEROS — REGRA OBRIGATÓRIA:
- Preserve a precisão numérica visível. Nunca arredonde uma odd para duas casas por conta própria.
- Se o print mostrar 1,122222, retorne 1.122222. Se mostrar 1,12, retorne 1.12.
- O número de casas decimais deve refletir o que está visível no print, sem truncar nem arredondar.
- Para valores monetários, preserve os centavos visíveis.
- Não calcule uma odd individual ausente.
- Se a odd total e as odds das pernas estiverem visíveis, compare a multiplicação com a odd total apenas como validação e avise se houver divergência relevante.

DATA E HORA:
- Transcreva a data/hora exatamente como aparece no print, mesmo que esteja no formato brasileiro DD/MM/YYYY - HH:mm.
- A aplicação fará a normalização para timestamp antes de salvar.

RESULTADO:
- Detecte green, red, anulada ou cashout somente quando houver evidência clara no comprovante.
- Cashout significa encerramento antecipado. Se houver valor recebido no cashout, preencha valor_resgatado.
- status_detectado descreve somente o que o print mostra. O usuário ainda confirma status_usuario antes do salvamento.

CONFIANÇA:
- confianca deve representar a qualidade real da leitura entre 0 e 1.
- Não aumente a confiança para preencher lacunas.
- avisos devem indicar dados ausentes, ambíguos, cortados, ilegíveis ou inconsistentes.

IMPORTANTE:
- Não confunda retorno bruto com lucro.
- Você extrai os dados; o Gestão Banca calcula o resultado financeiro.
- Retorne SOMENTE o JSON conforme o schema. Nunca escreva texto fora do JSON.`;

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
    status_usuario: "pendente",
    pernas,
    avisos: Array.isArray(data.avisos) ? data.avisos : []
  };

  if (result.status_detectado === "cashout" && result.valor_resgatado == null) {
    result.avisos.push("O comprovante indica cashout, mas o valor resgatado não foi identificado.");
  }

  return result;
}
