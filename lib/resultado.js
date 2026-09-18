import { lucroBilhete, validarFinanceiro, STATUS_USUARIO } from "./types";

export function statusDaPerna(perna) {
  const status = perna?.status_usuario;
  if (["green", "red", "anulada", "pendente"].includes(status)) return status;
  if (perna?.status_print === "acertou") return "green";
  if (perna?.status_print === "errou") return "red";
  if (perna?.status_print === "anulada") return "anulada";
  return "pendente";
}

export function fecharBilhete(bilhete) {
  const pernas = Array.isArray(bilhete?.pernas) ? bilhete.pernas : bilhete?.payload?.pernas || [];
  const normalizedPernas = pernas.map((perna, index) => ({
    ...perna,
    ordem: Number(perna?.ordem) || index + 1,
  }));

  let status_usuario = STATUS_USUARIO.includes(bilhete?.status_usuario)
    ? bilhete.status_usuario
    : "pendente";

  // Decisão explícita do usuário tem prioridade absoluta.
  if (status_usuario === "pendente") {
    const statuses = normalizedPernas.map(statusDaPerna);
    if (statuses.some((status) => status === "red")) status_usuario = "red";
    else if (normalizedPernas.length && statuses.every((status) => status === "green" || status === "anulada")) status_usuario = "green";
  }

  const ticket = {
    ...bilhete,
    pernas: normalizedPernas,
    payload: { ...(bilhete.payload || {}), pernas: normalizedPernas },
    status_usuario,
  };

  ticket.avisos = Array.isArray(ticket.avisos) ? [...ticket.avisos] : [];
  ticket.avisos = ticket.avisos.filter((item, index, list) => list.indexOf(item) === index);
  ticket.avisos.push(...validarFinanceiro(ticket));
  ticket.avisos = ticket.avisos.filter((item, index, list) => list.indexOf(item) === index);
  ticket.lucro = lucroBilhete(ticket);
  return ticket;
}

export function marcarPerna(bilhete, ordem, status_usuario) {
  if (!["green", "red", "anulada", "pendente"].includes(status_usuario)) return bilhete;

  const pernas = (bilhete?.pernas || bilhete?.payload?.pernas || []).map((perna, index) => {
    if ((Number(perna?.ordem) || index + 1) !== Number(ordem)) return perna;
    return {
      ...perna,
      status_usuario,
      status_print:
        status_usuario === "green" ? "acertou" :
        status_usuario === "red" ? "errou" :
        status_usuario === "anulada" ? "anulada" :
        perna.status_print,
    };
  });
  return fecharBilhete({ ...bilhete, pernas, status_usuario: "pendente" });
}
