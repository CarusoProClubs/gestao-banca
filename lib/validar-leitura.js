import { STATUS_USUARIO, numeroFinito } from "./types";

const STATUS_PRINT = ["acertou", "errou", "anulada", "desconhecido"];

export function validarLeitura(leitura) {
  const avisos = Array.isArray(leitura?.avisos) ? [...leitura.avisos] : [];
  const erros = [];
  const pernas = Array.isArray(leitura?.pernas) ? leitura.pernas : [];

  if (leitura?.documento_valido !== true) erros.push("O documento não foi confirmado como comprovante válido.");
  if (!leitura?.casa) avisos.push("Casa de aposta não identificada.");
  if (numeroFinito(leitura?.valor_apostado) == null || Number(leitura.valor_apostado) <= 0) avisos.push("Valor apostado ausente ou inválido.");
  if (leitura?.odd_bilhete != null && (Number(leitura.odd_bilhete) <= 0 || !Number.isFinite(Number(leitura.odd_bilhete)))) avisos.push("Odd total inválida.");

  const ordens = new Set();
  pernas.forEach((perna, index) => {
    const ordem = Number(perna?.ordem);
    if (!Number.isInteger(ordem) || ordem <= 0) erros.push(`Perna ${index + 1} possui ordem inválida.`);
    if (ordens.has(ordem)) erros.push(`A ordem ${ordem} aparece em mais de uma perna.`);
    ordens.add(ordem);
    if (!STATUS_PRINT.includes(perna?.status_print)) erros.push(`Status visual inválido na perna ${ordem || index + 1}.`);
    if (perna?.odd_perna != null && (!Number.isFinite(Number(perna.odd_perna)) || Number(perna.odd_perna) <= 0)) avisos.push(`Odd inválida na perna ${ordem || index + 1}.`);
  });

  if (leitura?.status_detectado === "cashout" && leitura?.valor_resgatado == null) avisos.push("Cashout identificado sem valor resgatado visível.");
  if (leitura?.status_detectado && leitura.status_detectado !== "desconhecido" && !STATUS_USUARIO.includes(leitura.status_detectado)) erros.push("Status detectado fora do contrato.");
  if (pernas.length === 0 && leitura?.documento_valido === true) avisos.push("Nenhuma perna foi identificada. Confira se o print contém os palpites.");

  const unique = (items) => items.filter((item, index) => item && items.indexOf(item) === index);
  leitura.avisos = unique([...avisos, ...erros]);
  leitura.erros_validacao = unique(erros);
  leitura.leitura_aprovada = erros.length === 0;
  return leitura;
}
