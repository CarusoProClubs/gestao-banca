export function limitesSalario(periodicidade, agora = new Date()) {
  const y = agora.getFullYear();
  const m = agora.getMonth();
  const d = agora.getDate();
  if (periodicidade === "semanal") {
    const day = agora.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const inicio = new Date(agora);
    inicio.setHours(0, 0, 0, 0);
    inicio.setDate(agora.getDate() + mondayOffset);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    fim.setHours(23, 59, 59, 999);
    return { inicio, fim, rotulo: "esta semana" };
  }
  if (periodicidade === "quinzenal") {
    if (d <= 15) {
      return {
        inicio: new Date(y, m, 1, 0, 0, 0, 0),
        fim: new Date(y, m, 15, 23, 59, 59, 999),
        rotulo: "esta quinzena",
      };
    }
    return {
      inicio: new Date(y, m, 16, 0, 0, 0, 0),
      fim: new Date(y, m + 1, 0, 23, 59, 59, 999),
      rotulo: "esta quinzena",
    };
  }
  return {
    inicio: new Date(y, m, 1, 0, 0, 0, 0),
    fim: new Date(y, m + 1, 0, 23, 59, 59, 999),
    rotulo: "este mês",
  };
}

export function orcamentoDoPeriodo(settings) {
  const salario = Number(settings.salario_mensal || 0);
  const pct = Number(settings.percentual_lazer || 0);
  const mensal = salario * pct;
  if (settings.periodicidade === "semanal") return mensal / 4;
  if (settings.periodicidade === "quinzenal") return mensal / 2;
  return mensal;
}

export function termometroFamiliar({ lucro, pendente, orcamento }) {
  const consumo =
    lucro >= 0 ? Math.max(0, pendente - lucro) : Math.abs(lucro) + pendente;
  const seguro = consumo <= Number(orcamento || 0);
  return { consumo, seguro };
}
