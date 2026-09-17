function timeDoJogo(jogo, lado) {
  const partes = String(jogo || "").split(/\s+[x×@]\s+/i).map((p) => p.trim()).filter(Boolean);
  if (lado === 2) return partes[1] || partes[0] || "";
  return partes[0] || "";
}

function encaixa(nome, texto) {
  const a = String(nome || "").toLowerCase();
  const b = String(texto || "").toLowerCase();
  return a && b && (b.includes(a) || a.includes(b.split(" ")[0]));
}

export function rotuloMercado(mercado, jogo) {
  const bruto = String(mercado || "").trim();
  if (!bruto) return "—";
  const n = bruto.toLowerCase();

  const over = n.match(/over\s*(\d+[.,]\d+)\s*(gols|pontos)?/i);
  if (over) {
    const unidade = /ponto/i.test(n) ? "pontos" : "gols";
    if (over[1].startsWith("0")) return unidade === "gols" ? "Sai pelo menos 1 gol" : `Mais de ${over[1]} pontos`;
    return `Mais de ${over[1]} ${unidade}`;
  }

  if (/ambas/.test(n)) return "As duas equipes marcam";

  const vence = bruto.match(/^(.+?)\s+vence$/i);
  if (vence) return `Vencedor da partida ${vence[1].trim()}`;

  const moneyline = bruto.match(/^(.+?)\s+moneyline$/i);
  if (moneyline) {
    const casa = timeDoJogo(jogo, 1);
    const fora = timeDoJogo(jogo, 2);
    const nome = encaixa(moneyline[1], casa) ? casa : encaixa(moneyline[1], fora) ? fora : moneyline[1];
    return `Vencedor da partida ${nome}`;
  }

  const dupla = bruto.match(/^(.+?)\s+(1x|x2|12)$/i);
  if (dupla) {
    const casa = timeDoJogo(jogo, 1);
    const fora = timeDoJogo(jogo, 2);
    const codigo = dupla[2].toUpperCase();
    const nome =
      codigo === "X2" ? (encaixa(dupla[1], fora) ? fora : fora || dupla[1]) : encaixa(dupla[1], casa) ? casa : casa || dupla[1];
    return `Vencedor da partida ${nome}`;
  }

  return bruto;
}
