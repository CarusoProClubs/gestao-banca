export const NIVEIS = {
  segura: {
    id: "segura",
    nome: "Segura",
    fatia: 0.1,
    oddMax: 2.1,
    formatos: ["simples", "classica"],
    texto: "Usa só 10% do teto por entrada. Prefere odd até 2.10 e bilhete simples.",
  },
  media: {
    id: "media",
    nome: "Média",
    fatia: 0.2,
    oddMax: 3,
    formatos: ["simples", "dupla", "classica"],
    texto: "Usa 20% do teto. Aceita odd até 3.00 e no máximo uma dupla.",
  },
  alta: {
    id: "alta",
    nome: "Alto risco",
    fatia: 0.35,
    oddMax: 5,
    formatos: ["simples", "dupla", "tripla", "criar_aposta"],
    texto: "Usa até 35% do teto. Só faz sentido se o termômetro estiver seguro.",
  },
};

export function planoAlavancagem(settings, orcamento) {
  const nivel = NIVEIS[settings.nivel_risco] || NIVEIS.segura;
  const stake = Number(orcamento || 0) * nivel.fatia;
  return { ...nivel, stake, orcamento: Number(orcamento || 0) };
}
