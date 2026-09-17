const TROCAS = [
  [/\b1X\s*\(dupla hip[oó]tese\)/gi, "ganha ou empata"],
  [/\bdupla hip[oó]tese\b/gi, "ganha ou empata"],
  [/\b1X2\b/g, "quem vence o jogo"],
  [/\b1X\b/g, "ganha ou empata"],
  [/\bX2\b/g, "empata ou o visitante ganha"],
  [/moneyline/gi, "vencedor da partida"],
  [/spread/gi, "vantagem de pontos"],
  [/handicap asi[aá]tico/gi, "vantagem"],
  [/\bhandicap\b/gi, "vantagem"],
  [/\bbtts\b|ambas marcam/gi, "as duas equipes marcam"],
  [/to nil/gi, "ganha sem tomar gol"],
  [/clean sheet/gi, "sem tomar gol"],
  [/\boutright\b/gi, "campeão da competição"],
  [/favorito mais curto|favorito curto/gi, "favorito quase certo"],
  [/odd curta|odds curtas/gi, "preço baixo"],
  [/\bodds?\b/gi, "preço"],
  [/O\/U/g, "mais/menos"],
  [/\bOver\s+alto\b/gi, "uma linha de gols mais alta"],
  [/\bUnder\s+alto\b/gi, "uma linha de gols mais baixa"],
  [/\bOver\s+(\d+(?:[.,]\d+)?)/gi, "mais de $1"],
  [/\bUnder\s+(\d+(?:[.,]\d+)?)/gi, "menos de $1"],
  [/\bOver\b/gi, "mercado de gols"],
  [/\bUnder\b/gi, "mercado de gols mais baixo"],
  [/\bstake\b/gi, "valor"],
  [/\bbankroll\b/gi, "banca"],
  [/\bTNF\b/g, "jogo de quinta à noite"],
];

function americana(_, sinal, numero) {
  const n = Number(numero);
  if (sinal === "-" && n >= 200) return "favorito forte";
  if (sinal === "-") return "favorito";
  return "azarão";
}

export function textoLimpo(valor) {
  let saida = String(valor || "");
  saida = saida.replace(/(^|\s)[•*-]\s+/g, "$1");
  saida = saida.replace(/([+-])(\d{3,4})\b/g, americana);
  for (const [de, para] of TROCAS) saida = saida.replace(de, para);
  return saida.replace(/\s{2,}/g, " ").trim();
}
