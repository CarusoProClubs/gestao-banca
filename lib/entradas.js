import { resumirAnalise } from "./analise";
import { NIVEIS } from "./alavancagem";

export function entradasDoDia(tickets, nivelId = "segura") {
  const nivel = NIVEIS[nivelId] || NIVEIS.segura;
  const analise = resumirAnalise(tickets);
  const mercado = analise.porMercado.find((row) => row.lucro > 0 && row.green > 0);
  const faixa = analise.porFaixaOdd.find((row) => {
    if (row.lucro <= 0 || !row.green) return false;
    if (nivel.id === "segura") return row.nome.includes("1.80") || row.nome.includes("2.10");
    if (nivel.id === "media") return !row.nome.includes("Acima de 3");
    return true;
  }) || analise.porFaixaOdd.find((row) => row.lucro > 0);
  const evitar = analise.porMercado.find((row) => row.red > row.green && row.lucro < 0);
  const itens = [];
  if (mercado) {
    itens.push({
      titulo: `Priorize ${mercado.nome}`,
      motivo: `No seu histórico esse mercado já deu ${mercado.green} green e ${mercado.lucro.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Combina com o nível ${nivel.nome.toLowerCase()}.`,
    });
  }
  if (faixa) {
    itens.push({
      titulo: `Trabalhe a faixa ${faixa.nome}`,
      motivo: `Foi a faixa com melhor saldo para você. No nível ${nivel.nome.toLowerCase()} a odd máxima sugerida é ${nivel.oddMax.toFixed(2)}.`,
    });
  }
  if (evitar) {
    itens.push({
      titulo: `Evite ${evitar.nome} hoje`,
      motivo: `Esse mercado está negativo na sua banca (${evitar.red} red). Não é palpite do dia; é filtro do seu próprio histórico.`,
    });
  }
  if (!itens.length) {
    itens.push({
      titulo: "Ainda sem padrão de green",
      motivo: "Lance mais bilhetes e marque o resultado. As entradas do dia nascem do que você já lucrou, não de palpite externo.",
    });
  }
  return { nivel, itens };
}
