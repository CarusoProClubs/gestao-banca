import { lucroBilhete } from "./types";

export function statusDaPerna(perna) {
  return perna?.status_usuario || (perna?.status_print === "acertou" ? "green" : perna?.status_print === "errou" ? "red" : "pendente");
}

export function fecharBilhete(bilhete) {
  const pernas = Array.isArray(bilhete?.pernas) ? bilhete.pernas : bilhete?.payload?.pernas || [];
  const statuses = pernas.map(statusDaPerna);
  let status_usuario = bilhete?.status_usuario || "pendente";

  // Cashout e anulada são estados do bilhete inteiro e não devem ser
  // sobrescritos pela avaliação individual das pernas.
  if (status_usuario === "cashout" || bilhete?.status_detectado === "cashout") {
    status_usuario = "cashout";
  } else if (status_usuario === "anulada") {
    status_usuario = "anulada";
  } else if (statuses.some((status) => status === "red")) {
    status_usuario = "red";
  } else if (pernas.length && statuses.every((status) => status === "green" || status === "anulada")) {
    status_usuario = "green";
  } else if (pernas.length) {
    status_usuario = "pendente";
  }

  const ticket = {
    ...bilhete,
    pernas,
    payload: { ...(bilhete.payload || bilhete), pernas },
    status_usuario,
  };
  ticket.lucro = lucroBilhete(ticket);
  return ticket;
}

export function marcarPerna(bilhete, ordem, status_usuario) {
  const pernas = (bilhete.pernas || bilhete.payload?.pernas || []).map((perna) => {
    if ((perna.ordem || 0) !== ordem && perna.selecao !== ordem) return perna;
    return {
      ...perna,
      status_usuario,
      status_print: status_usuario === "green" ? "acertou" : status_usuario === "red" ? "errou" : perna.status_print,
    };
  });
  return fecharBilhete({ ...bilhete, pernas });
}
