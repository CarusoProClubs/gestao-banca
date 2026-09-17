const MODEL = process.env.OPENAI_BETTING_VISION_MODEL || "gpt-5.6-luna";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    versao: { type: "string" },
    origem: { type: "string" },
    documento_valido: { type: "boolean" },
    motivo_invalido: { type: ["string", "null"] },
    casa: { type: ["string", "null"] },
    id_casa: { type: ["string", "null"] },
    codigo_booking: { type: ["string", "null"] },
    data_hora: { type: ["string", "null"] },
    tipo: { type: ["string", "null"] },
    formato: { type: ["string", "null"] },
    titulo: { type: ["string", "null"] },
    valor_apostado: { type: ["number", "null"] },
    moeda: { type: "string" },
    odd_bilhete: { type: ["number", "null"] },
    retorno_casa: { type: ["number", "null"] },
    valor_resgatado: { type: ["number", "null"] },
    status_detectado: { type: "string", enum: ["pendente", "green", "red", "anulada", "cashout", "desconhecido"] },
    esporte: { type: ["string", "null"] },
    jogo: { type: ["string", "null"] },
    pernas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          ordem: { type: "integer" },
          jogo: { type: ["string", "null"] },
          selecao: { type: ["string", "null"] },
          mercado: { type: ["string", "null"] },
          odd_perna: { type: ["number", "null"] },
          placar_print: { type: ["string", "null"] },
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

const INSTRUCTIONS = `Você é o leitor especializado de comprovantes de apostas esportivas do Gestão Banca.

Sua tarefa é analisar TODAS as imagens recebidas como partes de UM ÚNICO bilhete. Nunca trate cada imagem como uma aposta separada. Combine informações complementares entre elas.

REGRAS DE PRECISÃO:
- Analise visualmente a estrutura da tela, não faça apenas OCR literal.
- Identifique a casa de apostas, o bilhete, eventos, times, mercados, seleções, odds, valor apostado, retorno, data/hora e identificadores quando realmente estiverem visíveis.
- Preserve exatamente nomes de times, jogadores, competições e seleções visíveis. Não invente nem "corrija" um nome para algo plausível.
- Se um campo não estiver legível ou não puder ser determinado com segurança, use null e adicione um aviso. É melhor deixar vazio do que inventar.
- Não transforme texto de interface em seleção. Diferencie cabeçalhos, botões, mercados, eventos e valores.
- Se houver múltiplas pernas, crie uma perna para cada evento/seleção identificável, mantendo a ordem visual quando possível.
- Não descarte uma perna apenas porque outra imagem contém dados complementares.
- Para odds, valores monetários e identificadores, transcreva apenas o que estiver realmente visível.
- Não calcule uma odd individual que não esteja visível. A odd total pode ser calculada somente como validação interna, mas o campo deve permanecer null se não estiver no comprovante.
- Detecte cashout/encerramento antecipado. Se houver valor resgatado, preencha valor_resgatado e status_detectado=cashout.
- Green/Red/Anulada devem ser usados somente quando o comprovante mostrar claramente o resultado. Caso contrário, status_detectado=pendente ou desconhecido.
- status_detectado descreve o que o comprovante mostra; o usuário ainda poderá confirmar/corrigir antes de salvar.
- documento_valido=false se não houver evidência suficiente de que as imagens representam um comprovante de aposta.
- confianca deve refletir a qualidade real da leitura: 0 a 1. Não aumente a confiança apenas para parecer completo.
- avisos devem apontar campos ausentes, ambíguos, parcialmente cortados, ilegíveis ou inconsistências encontradas.

VALIDAÇÃO:
- Se houver odd total e odds das pernas visíveis, verifique se a multiplicação é aproximadamente compatível. Se houver divergência relevante, adicione aviso.
- Se houver valor apostado e retorno, não confunda retorno bruto com lucro.
- Em cashout, valor_resgatado é o valor recebido no encerramento antecipado, não o lucro.
- O sistema posterior calcula o resultado financeiro; você apenas extrai os dados.

RETORNE SOMENTE O JSON definido pelo schema.`;

function mimeType(file) {
  const type = file.type || "";
  if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type)) return type;
  throw new Error(`Formato de imagem não suportado: ${type || file.name}`);
}

export async function interpretarBilhete(files) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY não configurada no servidor.");
  if (!files?.length) throw new Error("Nenhuma imagem foi enviada.");
  if (files.length > 8) throw new Error("Envie no máximo 8 imagens por bilhete.");

  const content = [{ type: "input_text", text: INSTRUCTIONS }];
  for (const file of files) {
    const type = mimeType(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 12 * 1024 * 1024) throw new Error(`A imagem ${file.name} excede 12 MB.`);
    content.push({
      type: "input_image",
      image_url: `data:${type};base64,${buffer.toString("base64")}`,
      detail: "high"
    });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "bilhete_aposta",
          strict: true,
          schema
        }
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha no leitor de visão (${response.status}): ${detail.slice(0, 500)}`);
  }

  const data = await response.json();
  if (!data.output_text) throw new Error("O leitor não retornou dados estruturados.");

  let parsed;
  try {
    parsed = JSON.parse(data.output_text);
  } catch {
    throw new Error("O leitor retornou uma resposta inválida.");
  }

  return normalizarLeitura(parsed);
}

function normalizarLeitura(data) {
  const pernas = Array.isArray(data.pernas) ? data.pernas.map((p, i) => ({
    ordem: Number(p.ordem || i + 1),
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
    versao: "2.0",
    origem: "vision",
    status_usuario: "pendente",
    pernas,
    avisos: Array.isArray(data.avisos) ? data.avisos : []
  };

  if (result.status_detectado === "cashout" && result.valor_resgatado == null) {
    result.avisos.push("O comprovante indica cashout, mas o valor resgatado não foi identificado.");
  }

  return result;
}
