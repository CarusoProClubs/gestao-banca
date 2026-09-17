export const NIVEIS = {
  segura: {
    id: "segura",
    nome: "Risco baixo",
    fatia: 0.1,
    oddMax: 2.1,
    multiploMin: 3,
    multiploMax: 5,
    texto: "Meta da semana: devolver 3x a 5x o valor investido.",
  },
  media: {
    id: "media",
    nome: "Risco médio",
    fatia: 0.2,
    oddMax: 3,
    multiploMin: 7,
    multiploMax: 9,
    texto: "Meta da semana: devolver 7x a 9x o valor investido.",
  },
  alta: {
    id: "alta",
    nome: "Risco alto",
    fatia: 0.35,
    oddMax: 5,
    multiploMin: 10,
    multiploMax: 15,
    texto: "Meta da semana: devolver 10x a 15x o valor investido.",
  },
};

export function planoAlavancagem(settings, orcamento) {
  const nivel = NIVEIS[settings.nivel_risco] || NIVEIS.segura;
  const stake = Number(orcamento || 0) * nivel.fatia;
  return { ...nivel, stake, orcamento: Number(orcamento || 0) };
}

export function inicioSemana(agora = new Date()) {
  const day = agora.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const inicio = new Date(agora);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(agora.getDate() + offset);
  return inicio.toISOString().slice(0, 10);
}
