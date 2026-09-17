const TROCAS = [
  [/dupla hip[oó]tese/gi, "ganha ou empata"],
  [/\b1X2\b/g, "quem vence o jogo"],
  [/\b1X\b/g, "ganha ou empata"],
  [/\bX2\b/g, "empata ou o visitante ganha"],
  [/\b12\b(?!\s*pontos)/g, "um dos dois vence"],
  [/moneyline/gi, "vencedor da partida"],
  [/\bspread\b/gi, "vantagem de pontos"],
  [/handicap asi[aá]tico/gi, "vantagem"],
  [/\bhandicap\b/gi, "vantagem"],
  [/asi[aá]tico/gi, "com vantagem"],
  [/\bbtts\b|ambas marcam/gi, "as duas equipes marcam"],
  [/to nil|city to nil/gi, "ganha sem tomar gol"],
  [/clean sheet/gi, "sem tomar gol"],
  [/\boutright\b/gi, "campeão da competição"],
  [/favorito mais curto|favorito curto/gi, "favorito quase certo"],
  [/odd curta|odds curtas/gi, "preço baixo"],
  [/\bodds?\b/gi, "preço"],
  [/\blinha\b/gi, "número do mercado"],
  [/O\/U/g, "mais/menos"],
  [/\bOver\s+/gi, "mais de "],
  [/\bUnder\s+/gi, "menos de "],
  [/\btotal\b/gi, "soma de pontos"],
  [/\bstake\b/gi, "valor"],
  [/\bbankroll\b/gi, "banca"],
  [/value bet|\bvalor\b(?=\s+est)/gi, "preço interessante"],
  [/\bTNF\b/g, "jogo de quinta à noite"],
  [/\bML\b/g, "vencedor"],
  [/[\u2014-](\d+[.,]\d+)\s*\(asi[aá]tico\)/gi, "ganhar por margem ($1)"],
];

function americana(match, sinal, numero) {
  const n = Number(numero);
  if (sinal === "-" && n >= 200) return "favorito forte";
  if (sinal === "-" && n >= 150) return "favorito";
  if (sinal === "+") return "azarão";
  return match;
}

export function textoLimpo(valor) {
  let saida = String(valor || "");
  saida = saida.replace(/([+-])(\d{3,4})\b/g, americana);
  for (const [de, para] of TROCAS) saida = saida.replace(de, para);
  saida = saida.replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n");
  return saida.trim();
}
