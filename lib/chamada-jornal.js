function limpa(valor) {
  return String(valor || "").replace(/\s+/g, " ").trim();
}

function confronto(jogo) {
  return limpa(jogo.jogo).replace(/\s+[x×]\s+/i, " x ");
}

function extra(jogo) {
  const texto = limpa(jogo.noticia || "");
  if (!texto) return "";
  const semEco = texto
    .replace(confronto(jogo), "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\-—,\.\s]+/, "")
    .trim();
  return semEco;
}

export function chamadaJornal(jogos) {
  const lista = (jogos || []).filter((j) => j.jogo);
  if (!lista.length) return "";
  const primeiro = lista[0];
  const resto = lista.slice(1, 8);
  const detalhePrimeiro = extra(primeiro);
  let texto = `Nos principais jogos de hoje o destaque fica para ${confronto(primeiro)}`;
  if (primeiro.liga) texto += `, que se enfrentam pela ${limpa(primeiro.liga)}`;
  if (primeiro.hora) texto += ` às ${limpa(primeiro.hora)}`;
  if (detalhePrimeiro) texto += `. ${detalhePrimeiro.replace(/^[A-Z].*?\s[\-—]\s/, "")}`;
  if (!texto.endsWith(".")) texto += ".";
  if (resto.length) {
    const frases = resto.map((jogo, index) => {
      const liga = jogo.liga ? ` pela ${limpa(jogo.liga)}` : "";
      const quando = jogo.hora ? ` às ${limpa(jogo.hora)}` : "";
      const nota = extra(jogo);
      const miolo = `${confronto(jogo)}${liga}${quando}`;
      if (index === 0) return `Além desse jogo, a edição ainda reserva ${miolo}${nota ? `, ${nota}` : ""}`;
      if (index === resto.length - 1) return `e ${miolo}`;
      return miolo;
    });
    texto += ` ${frases.join("; ")}.`;
  }
  return texto.replace(/\.\./g, ".").replace(/\s{2,}/g, " ");
}
