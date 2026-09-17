function hora(jogo) {
  return jogo.hora || "";
}

function nome(jogo) {
  return String(jogo.jogo || "")
    .replace(/\s+/g, " ")
    .replace(/\s+[x×@]\s+/i, " e ")
    .trim();
}

export function chamadaJornal(jogos) {
  const lista = (jogos || []).filter((j) => j.jogo);
  if (!lista.length) return "";
  if (lista.length === 1) {
    const unico = lista[0];
    return `A edição abre com ${nome(unico)}${hora(unico) ? `, às ${hora(unico)}` : ""}${unico.liga ? `, pela ${unico.liga}` : ""}.`;
  }
  const primeiro = lista[0];
  const ultimo = lista[lista.length - 1];
  const meio = lista.slice(1, -1).map((j) => nome(j));
  const pecas = [
    `A edição abre com ${nome(primeiro)}${hora(primeiro) ? ` às ${hora(primeiro)}` : ""}${primeiro.liga ? `, pela ${primeiro.liga}` : ""}`,
  ];
  if (meio.length) pecas.push(`passa por ${meio.join(", ")}`);
  pecas.push(`e fecha o giro em ${nome(ultimo)}${hora(ultimo) ? `, às ${hora(ultimo)}` : ""}.`);
  return pecas.join(", ").replace(", e fecha", " e fecha");
}
