const TROCAS = [
  [/dupla hip[oó]tese/gi, "ganha ou empata"],
  [/\b1X2\b/g, "quem vence o jogo"],
  [/\b1X\b/g, "ganha ou empata"],
  [/\bX2\b/g, "empata ou o visitante ganha"],
  [/moneyline/gi, "vencedor da partida"],
  [/\bspread\b/gi, "vantagem de pontos"],
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
  [/\bOver\s+/gi, "mais de "],
  [/\bUnder\s+/gi, "menos de "],
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
  saida = saida.replace(/([+-])(\d{3,4})\b/g, americana);
  for (const [de, para] of TROCAS) saida = saida.replace(de, para);
  return saida.trim();
}
