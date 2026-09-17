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
- Transcreva a data/hora visível, inclusive formatos como DD/MM/YYYY - HH:mm e formatos abreviados como "Qui 17 Sep 21:15".
- Não invente um ano que não esteja visível. A aplicação tentará normalizar formatos abreviados antes de salvar.

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

const MESES = {
  jan: 0, janeiro: 0,
  feb: 1, fev: 1, fevereiro: 1,
  mar: 2, marco: 2, março: 2, marco: 2, março: 2,
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

const DIAS_SEMANA = {
  dom: 0, domingo: 0,
  seg: 1, segunda: 1, segunda-feira: 1,
  ter: 2, terça: 2, terca: 2, terça-feira: 2, terca-feira: 2,
  qua: 3, quarta: 3, quarta-feira: 3,
  qui: 4, quinta: 4, quinta-feira: 4,
  sex: 5, sexta: 5, sexta-feira: 5,
  sáb: 6, sab: 6, sábado: 6, sabado: 6
};

function anoMaisProvavel(dia, mes, diaSemana) {
  const anoAtual = new Date().getUTCFullYear();
  const candidatos = [];
  for (let ano = anoAtual - 5; ano <= anoAtual + 1; ano += 1) {
    const data = new Date(Date.UTC(ano, mes, dia));
    if (data.getUTCFullYear() === ano && data.getUTCMonth() === mes && data.getUTCDate() === dia) {
      if (diaSemana == null || data.getUTCDay() === diaSemana) candidatos.push(ano);
    }
  }
  if (!candidatos.length) return null;
  return candidatos.sort((a, b) => Math.abs(a - anoAtual) - Math.abs(b - anoAtual))[0];
}

function normalizarDataHora(valor) {
  if (!valor || typeof valor !== "string") return valor || null;
  const texto = valor.trim();

  const completo = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s*[-–—]?\s*)(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (completo) {
    let [, dia, mes, ano, hora, minuto, segundo] = completo;
    if (ano.length === 2) ano = Number(ano) >= 70 ? `19${ano}` : `20${ano}`;
    return montarTimestamp(ano, Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo || 0));
  }

  // Exemplos: "Qui 17 Sep 21:15", "17 Sep 21:15", "Qui 17 Setembro 21:15".
  const abreviado = texto.match(/^(?:(domingo|segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|dom|seg|ter|qua|qui|sex|sáb|sab)\s+)?(\d{1,2})\s+([A-Za-zÀ-ÿ]+)(?:\s+(\d{4}))?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/i);
  if (abreviado) {
    const diaSemanaTexto = abreviado[1]?.toLowerCase();
    const diaSemana = diaSemanaTexto == null ? null : DIAS_SEMANA[diaSemanaTexto];
    const dia = Number(abreviado[2]);
    const mesTexto = abreviado[3].toLowerCase();
    const mes = MESES[mesTexto];
    const anoInformado = abreviado[4] ? Number(abreviado[4]) : null;
    const hora = Number(abreviado[5]);
    const minuto = Number(abreviado[6]);
    const segundo = Number(abreviado[7] || 0);
    if (mes == null) return valor;
    const ano = anoInformado || anoMaisProvavel(dia, mes, diaSemana);
    if (!ano) return valor;
    const resultado = montarTimestamp(ano, mes, dia, hora, minuto, segundo);
    return resultado;
  }

  return valor;
}

function montarTimestamp(ano, mes, dia, hora, minuto, segundo) {
  const d = Number(dia), m = Number(mes), y = Number(ano), h = Number(hora), min = Number(minuto), s = Number(segundo);
  const data = new Date(Date.UTC(y, m, d, h, min, s));
  if (data.getUTCFullYear() !== y || data.getUTCMonth() !== m || data.getUTCDate() !== d || h > 23 || min > 59 || s > 59) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${y}-${pad(m + 1)}-${pad(d)}T${pad(h)}:${pad(min)}:${pad(s)}-03:00`;
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

  const dataHoraOriginal = data.data_hora;
  const dataHoraNormalizada = normalizarDataHora(dataHoraOriginal);
  const result = {
    ...data,
    versao: "3.0",
    origem: model,
    data_hora: dataHoraNormalizada,
    status_usuario: "pendente",
    pernas,
    avisos: Array.isArray(data.avisos) ? data.avisos : []
  };

  if (dataHoraOriginal && !dataHoraNormalizada) {
    result.avisos.push(`A data/hora "${dataHoraOriginal}" não pôde ser convertida automaticamente para timestamp.`);
  } else if (dataHoraOriginal && dataHoraNormalizada !== dataHoraOriginal && !/\d{4}/.test(dataHoraOriginal)) {
    result.avisos.push(`A data/hora "${dataHoraOriginal}" não exibia o ano; o sistema inferiu o ano mais provável a partir do dia da semana.`);
  }

  if (result.status_detectado === "cashout" && result.valor_resgatado == null) {
    result.avisos.push("O comprovante indica cashout, mas o valor resgatado não foi identificado.");
  }

  return result;
}
