export const NIVEIS_ALAVANCAGEM = ["segura", "media", "alta"];

export function estatisticasResultados(resultados = {}, totalEventos = 0) {
  const statuses = Array.from({ length: totalEventos }, (_, index) => resultados?.[index] || "pendente");
  const greens = statuses.filter((status) => status === "green").length;
  const reds = statuses.filter((status) => status === "red").length;
  const pendentes = statuses.filter((status) => status === "pendente").length;
  const decididos = greens + reds;
  let maiorGreen = 0, maiorRed = 0, sequenciaGreen = 0, sequenciaRed = 0;

  for (const status of statuses) {
    if (status === "green") {
      sequenciaGreen += 1; sequenciaRed = 0; maiorGreen = Math.max(maiorGreen, sequenciaGreen);
    } else if (status === "red") {
      sequenciaRed += 1; sequenciaGreen = 0; maiorRed = Math.max(maiorRed, sequenciaRed);
    } else {
      sequenciaGreen = 0; sequenciaRed = 0;
    }
  }

  const ultimoDecidido = [...statuses].reverse().find((status) => status === "green" || status === "red");
  const sequenciaAtualTipo = ultimoDecidido || null;
  let sequenciaAtual = 0;
  if (sequenciaAtualTipo) {
    for (let index = statuses.length - 1; index >= 0; index -= 1) {
      if (statuses[index] !== sequenciaAtualTipo) break;
      sequenciaAtual += 1;
    }
  }

  return {
    total: totalEventos, greens, reds, pendentes, decididos,
    aproveitamento: decididos ? (greens / decididos) * 100 : 0,
    maiorGreen, maiorRed, sequenciaAtual, sequenciaAtualTipo,
  };
}

export function estatisticasSemana(parsed, resultados = {}) {
  return NIVEIS_ALAVANCAGEM.reduce((acc, nivel) => {
    acc[nivel] = estatisticasResultados(resultados?.[nivel] || {}, parsed?.niveis?.[nivel]?.length || 0);
    return acc;
  }, {});
}

export function resumoSemana(parsed, resultados = {}) {
  const porNivel = estatisticasSemana(parsed, resultados);
  return NIVEIS_ALAVANCAGEM.reduce((acc, nivel) => {
    const item = porNivel[nivel];
    acc.total += item.total; acc.greens += item.greens; acc.reds += item.reds; acc.pendentes += item.pendentes;
    return acc;
  }, { total: 0, greens: 0, reds: 0, pendentes: 0 });
}
