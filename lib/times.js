const TIMES = [
  { nome: "São Paulo FC", testes: [/s[3aãáo0]o\s*paulo/i, /s\s*paulo\s*fc/i, /\bspfc\b/i] },
  { nome: "Corinthians", testes: [/corinthians/i, /timao/i] },
  { nome: "Palmeiras", testes: [/palmeiras/i] },
  { nome: "Santos", testes: [/\bsantos\b/i] },
  { nome: "Flamengo", testes: [/flamengo/i] },
  { nome: "Fluminense", testes: [/fluminense/i] },
  { nome: "Botafogo", testes: [/botafogo/i] },
  { nome: "Vasco", testes: [/\bvasco\b/i] },
  { nome: "Grêmio", testes: [/gremio/i, /grêmio/i] },
  { nome: "Internacional", testes: [/internacional/i, /\binter\b/i] },
  { nome: "Atlético-MG", testes: [/atletico[\s-]*mg/i, /galo/i] },
  { nome: "Cruzeiro", testes: [/cruzeiro/i] },
  { nome: "Athletico-PR", testes: [/athletico/i, /atletico[\s-]*pr/i] },
  { nome: "Bahia", testes: [/\bbahia\b/i] },
  { nome: "Fortaleza", testes: [/fortaleza/i] },
  { nome: "Bragantino", testes: [/bragantino/i] },
  { nome: "Cuiabá", testes: [/cuiaba/i] },
  { nome: "Goiás", testes: [/goias/i] },
  { nome: "Sport", testes: [/\bsport\b/i] },
  { nome: "Vitória", testes: [/vitoria/i] },
];

const LIXO_OCR = /\b(berdidg|berdida|bendida|perdida|ganhou|cganhou)\b/gi;

export function limparSujeiraOcr(texto) {
  return String(texto || "")
    .replace(LIXO_OCR, " ")
    .replace(/\(\s*/g, "(")
    .replace(/\s*\)/g, ")")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function corrigirTime(texto) {
  let saida = limparSujeiraOcr(texto);
  for (const time of TIMES) {
    for (const teste of time.testes) {
      saida = saida.replace(teste, time.nome);
    }
  }
  return saida.replace(/\s+/g, " ").trim();
}
