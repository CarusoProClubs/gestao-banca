export function oddNumero(valor) {
  const n = Number(String(valor || "").replace(",", "."));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function resultadoNivel(jogos, valor, resultados) {
  const investido = Number(String(valor || "").replace(",", ".")) || 0;
  let banca = investido;
  let teveRed = false;
  const linhas = (jogos || []).map((jogo, index) => {
    const status = resultados?.[index] || "pendente";
    const odd = oddNumero(jogo.odd);
    const stake = banca;
    let retorno = 0;
    if (status === "pendente") {
      return { ...jogo, index, status, odd, stake: banca, retorno: 0, perda: 0 };
    }
    if (status === "green") {
      retorno = banca * odd;
      banca = retorno;
      return { ...jogo, index, status, odd, stake, retorno, perda: 0 };
    }
    teveRed = true;
    banca = 0;
    return { ...jogo, index, status, odd, stake, retorno: 0, perda: investido };
  });
  return {
    investido,
    banca: teveRed ? 0 : banca,
    lucro: teveRed ? -investido : banca - investido,
    perda: teveRed ? investido : 0,
    encerrada: false,
    linhas,
  };
}
