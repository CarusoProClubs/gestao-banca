const CHAVES = [
  { id: "segura", nomes: ["segura", "baixo", "baixa", "low"] },
  { id: "media", nomes: ["media", "média", "medio", "médio"] },
  { id: "alta", nomes: ["alta", "alto", "high"] },
];

function linhaDoNivel(linhas, id) {
  const nomes = CHAVES.find((item) => item.id === id).nomes;
  return linhas.find((linha) => nomes.some((nome) => linha.toLowerCase().startsWith(nome)));
}

function parseMultiplos(linha) {
  const nums = [...String(linha || "").matchAll(/(\d+(?:[.,]\d+)?)\s*x/gi)].map((m) => Number(m[1].replace(",", ".")));
  if (nums.length >= 2) return { min: nums[0], max: nums[1] };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  if (/triplic/i.test(linha)) return { min: 3, max: 3 };
  if (/duplic/i.test(linha)) return { min: 2, max: 2 };
  return { min: null, max: null };
}

export function parseAlavancagemTxt(raw) {
  const linhas = String(raw || "")
    .split(/\r?\n/)
    .map((linha) => linha.replace(/[#].*$/, "").trim())
    .filter(Boolean);
  const niveis = {};
  for (const chave of CHAVES) {
    const linha = linhaDoNivel(linhas, chave.id) || "";
    const texto = linha.replace(/^[^:]*:\s*/i, "").trim() || linha;
    const multi = parseMultiplos(linha);
    niveis[chave.id] = {
      id: chave.id,
      texto: texto || null,
      multiploMin: multi.min,
      multiploMax: multi.max,
      linha,
    };
  }
  return { bruto: raw, niveis };
}
