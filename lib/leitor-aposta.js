const MODEL = process.env.GEMINI_BETTING_VISION_MODEL || "gemini-2.5-flash";

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

const INSTRUCTIONS = `Você é o leitor especializado de comprovantes de apostas esportivas do Gestão Banca.

Analise TODAS as imagens recebidas como partes de UM ÚNICO bilhete. Nunca trate cada imagem como uma aposta separada. Combine informações complementares entre elas.

REGRAS DE PRECISÃO:
- Entenda visualmente a estrutura da tela; não faça apenas OCR literal.
- Identifique casa de apostas, identificadores, data/hora, esporte, eventos, times, mercados, seleções, odds, valor apostado e retorno somente quando estiverem realmente visíveis.
- Preserve exatamente os nomes visíveis. Nunca invente, complete ou "corrija" um nome para algo plausível.
- Se um campo não estiver legível ou não puder ser determinado com segurança, use null e explique em avisos.
- Diferencie cabeçalhos, botões, mercados, eventos, seleções e valores.
- Se houver múltiplas pernas, crie uma perna para cada evento/seleção identificável e mantenha a ordem visual quando possível.
- Não descarte uma perna porque outra imagem contém os dados complementares.
- Para odds, valores monetários e identificadores, transcreva apenas o que estiver visível.
- Não calcule uma odd individual ausente. A odd total só pode ser usada para validação interna quando as odds das pernas também estiverem visíveis.
- Detecte cashout/encerramento antecipado. Se houver valor recebido no cashout, preencha valor_resgatado e status_detectado=cashout.
- Use green/red/anulada somente quando o comprovante mostrar claramente o resultado. Caso contrário, use pendente ou desconhecido.
- status_detectado descreve apenas o que a imagem mostra; o usuário ainda confirmará o status antes de salvar.
- documento_valido=false se não houver evidência suficiente de que as imagens representam um comprovante de aposta.
- confianca deve refletir a qualidade real da leitura entre 0 e 1. Não aumente a confiança para preencher lacunas.
- avisos devem apontar campos ausentes, ambíguos, parcialmente cortados, ilegíveis ou inconsistências.

VALIDAÇÃO:
- Se odd total e odds das pernas estiverem visíveis, verifique se a multiplicação é aproximadamente compatível e avise se houver divergência relevante.
- Não confunda retorno bruto com lucro.
- Em cashout, valor_resgatado é o valor recebido no encerramento antecipado, não o lucro.
- Você extrai dados; o Gestão Banca calcula o resultado financeiro.

Retorne SOMENTE o JSON conforme o schema. Nunca escreva explicações fora do JSON.`;

function mimeType(file) {
  const type = file.type || "";
  if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(type)) return type;
  throw new Error(`Formato de imagem não suportado: ${type || file.name}`);
}

function textoResposta(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || "").join("").trim();
}

export async function interpretarBilhete(files) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada no servidor.");
  if (!files?.length) throw new Error("Nenhuma imagem foi enviada.");
  if (files.length > 8) throw new Error("Envie no máximo 8 imagens por bilhete.");

  const parts = [{ text: INSTRUCTIONS }];
  for (const file of files) {
    const type = mimeType(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > 12 * 1024 * 1024) throw new Error(`A imagem ${file.name} excede 12 MB.`);
    parts.push({
      inlineData: {
        mimeType: type,
        data: buffer.toString("base64")
      }
    });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: schema
        }
      })
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha no leitor Gemini (${response.status}): ${detail.slice(0, 500)}`);
  }

  const data = await response.json();
  const output = textoResposta(data);
  if (!output) throw new Error("O Gemini não retornou dados estruturados.");

  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error("O Gemini retornou uma resposta JSON inválida.");
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
    origem: "gemini-2.5-flash",
    status_usuario: "pendente",
    pernas,
    avisos: Array.isArray(data.avisos) ? data.avisos : []
  };

  if (result.status_detectado === "cashout" && result.valor_resgatado == null) {
    result.avisos.push("O comprovante indica cashout, mas o valor resgatado não foi identificado.");
  }

  return result;
}
