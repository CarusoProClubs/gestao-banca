import { textoLimpo } from "./texto-limpo";

const MIUDAS = new Set(["de", "da", "do", "das", "dos", "e", "x", "em", "na", "no"]);

export function nomeProprio(valor) {
  return String(valor || "")
    .toLowerCase()
    .split(/(\s+|x|@)/
    )
    .map((parte, index) => {
      if (!parte.trim() || parte === "x" || parte === "@") return parte === "@" ? "x" : parte;
      if (index && MIUDAS.has(parte)) return parte;
      return parte.charAt(0).toUpperCase() + parte.slice(1);
    })
    .join("")
    .replace(/\s+x\s+/gi, " x ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function frase(valor) {
  const texto = textoLimpo(valor || "").replace(/\s+/g, " ").trim();
  if (!texto) return "";
  return /[.!?]$/.test(texto) ? texto : `${texto}.`;
}

export function vozAbertura(jogo) {
  if (!jogo?.jogo) return "";
  const nome = nomeProprio(jogo.jogo);
  const liga = jogo.liga ? `pela ${jogo.liga}` : "";
  const hora = jogo.hora ? `às ${jogo.hora}` : "";
  const extra = frase(jogo.noticia).replace(new RegExp(jogo.jogo, "ig"), "").trim();
  return [`O destaque fica para ${nome}`, liga, hora].filter(Boolean).join(", ") + (extra ? `. ${extra}` : ".");
}

export function chamadaBancada(jogos) {
  const lista = (jogos || []).filter((j) => j.jogo);
  if (!lista.length) return "";
  const primeiro = lista[0];
  const resto = lista.slice(1, 6);
  let texto = `Nos principais jogos de hoje, ${vozAbertura(primeiro).replace(/^O destaque fica para/, "o destaque fica para")}`;
  if (resto.length) {
    const nomes = resto.map((jogo, index) => {
      const base = `${nomeProprio(jogo.jogo)}${jogo.liga ? `, pela ${jogo.liga}` : ""}`;
      if (index === 0) return `Além desse, vale ficar de olho em ${base}`;
      if (index === resto.length - 1) return `e em ${base}`;
      return base;
    });
    texto += ` ${nomes.join("; ")}.`;
  }
  return texto.replace(/\.\./g, ".").replace(/\s{2,}/g, " ");
}

export function vozMateria(jogo) {
  const nome = nomeProprio(jogo.jogo);
  const liga = jogo.liga ? `pela ${jogo.liga}` : "";
  const hora = jogo.hora ? `às ${jogo.hora}` : "";
  const noticia = frase(jogo.noticia);
  return [`${nome} entra em campo ${liga} ${hora}`.replace(/\s{2,}/g, " ").trim() + ".", noticia].filter(Boolean).join(" ");
}

export function vozTexto(valor) {
  let saida = textoLimpo(valor || "");
  saida = saida
    .replace(/^resumo:\s*/gim, "Em resumo, ")
    .replace(/^o que pesa:\s*/gim, "O que pesa neste jogo é ")
    .replace(/^leitura:\s*/gim, "A leitura é esta: ")
    .replace(/^melhor preço:\s*|^melhor odd:\s*/gim, "O preço mais confortável aparece em ")
    .replace(/^preço de risco:\s*|^odd de risco:\s*/gim, "Quem quiser ir mais longe encontra ");
  return saida.trim();
}

export function vozTrecho(valor) {
  const limpo = vozTexto(valor).replace(/\n{2,}/g, "\n").trim();
  if (!limpo) return "";
  const partes = limpo.split(/\n/).filter(Boolean);
  const bloco = partes.slice(0, 5).join(" ");
  if (bloco.length <= 620) return bloco;
  const corte = bloco.slice(0, 620);
  const ponto = corte.lastIndexOf(". ");
  return `${ponto > 240 ? corte.slice(0, ponto + 1) : corte}…`;
}
