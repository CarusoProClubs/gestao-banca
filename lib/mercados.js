const MERCADOS = {
  resultado_final: "Vencedor",
  vencedor: "Vencedor",
  "1x2": "Vencedor",
  match_winner: "Vencedor",
  qualificar_se: "Classificar",
  classificar: "Classificar",
  receber_cartao: "Receber cartão",
  cartao: "Cartões",
  cartoes: "Cartões",
  gols: "Gols",
  mais_gols: "Mais gols",
  menos_gols: "Menos gols",
  over_under: "Gols",
  ambas_marcam: "Ambas marcam",
  escanteios: "Escanteios",
  finalizacoes: "Finalizações",
  chutes_no_gol: "Chutes no gol",
  handicap: "Handicap",
  handicap_asiatico: "Handicap asiático",
  intervalo: "Intervalo",
  primeiro_tempo: "1º tempo",
  segundo_tempo: "2º tempo",
  primeiro_gol: "Primeiro gol",
  proximo_gol: "Próximo gol",
  impedimentos: "Impedimentos",
  faltas: "Faltas",
  laterais: "Laterais",
  casa_marca: "Casa marca",
  fora_marca: "Fora marca",
  dupla_chance: "Dupla chance",
  placar_exato: "Placar exato",
  total_gols: "Total de gols",
  impar_par: "Ímpar / par",
  criar_aposta: "Criar aposta",
  classica: "Clássica",
  simples: "Simples",
  dupla: "Dupla",
  tripla: "Tripla",
  multipla: "Múltipla",
  outros: "Outros",
};

function slug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function nomeMercado(value) {
  const key = slug(value);
  if (!key) return "Outros";
  if (MERCADOS[key]) return MERCADOS[key];
  if (key.includes("resultado") || key.includes("vencedor") || key.includes("1x2")) return "Vencedor";
  if (key.includes("qualific") || key.includes("classific")) return "Classificar";
  if (key.includes("receber") && key.includes("cart")) return "Receber cartão";
  if (key.includes("cart")) return "Cartões";
  if (key.includes("escante")) return "Escanteios";
  if (key.includes("finaliz") || key.includes("chute")) return "Finalizações";
  if (key.includes("ambas")) return "Ambas marcam";
  if (key.includes("handicap")) return "Handicap";
  if (key.includes("gol")) return "Gols";
  return key.replace(/_/g, " ").replace(/\b\w/g, (letra) => letra.toUpperCase());
}

export function nomeTipo(tipo, formato) {
  const partes = [nomeMercado(tipo), formato ? nomeMercado(formato) : null].filter(Boolean);
  const unique = [...new Set(partes)];
  return unique.join(" · ") || "Outros";
}
