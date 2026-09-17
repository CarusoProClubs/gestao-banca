export function oddNumero(valor) {
  const n = Number(String(valor || "").replace(",", "."));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export function resultadoNivel(jogos, valor, resultados) {
  let banca = Number(valor || 0);
  let investido = Number(valor || 0);
  let encerrada = false;
  const linhas = (jogos || []).map((jogo, index) => {
    const status = resultados?.[index] || "pendente";
    const odd = oddNumero(jogo.odd);
    const stake = encerrada || status === "pendente" ? 0 : banca;
    let retorno = 0;
    let perda = 0;
    if (!encerrada && status === "green") {
      retorno = stake * odd;
      banca = retorno;
    } else if (!encerrada && status === "red") {
      perda = stake;
      banca = 0;
      encerrada = true;
    }
    return { ...jogo, index, status, odd, stake, retorno, perda };
  });
  return {
    investido,
    banca,
    lucro: banca - investido,
    perda: linhas.reduce((acc, linha) => acc + linha.perda, 0),
    encerrada,
    linhas,
  };
}
