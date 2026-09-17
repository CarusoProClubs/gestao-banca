export function dataDoBilhete(ticket) {
  const raw = ticket.data_hora || ticket.created_at;
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : new Date(0);
}

export function inicioPeriodo(tipo, customDe) {
  const now = new Date();
  if (tipo === "custom" && customDe) return new Date(`${customDe}T00:00:00`);
  if (tipo === "semana") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (tipo === "mes") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (tipo === "semestre") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 6);
    return d;
  }
  if (tipo === "ano") {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function fimPeriodo(tipo, customAte) {
  if (tipo === "custom" && customAte) return new Date(`${customAte}T23:59:59`);
  return new Date();
}

export function filtrarBilhetes(tickets, filtros) {
  const de = inicioPeriodo(filtros.periodo, filtros.de);
  const ate = fimPeriodo(filtros.periodo, filtros.ate);
  let lista = tickets.filter((ticket) => {
    const data = dataDoBilhete(ticket);
    if (data < de || data > ate) return false;
    if (filtros.casa && ticket.casa !== filtros.casa) return false;
    if (filtros.status && ticket.status_usuario !== filtros.status) return false;
    const valor = Number(ticket.valor_apostado || 0);
    if (filtros.valorMin && valor < Number(filtros.valorMin)) return false;
    if (filtros.valorMax && valor > Number(filtros.valorMax)) return false;
    return true;
  });
  const ordem = filtros.ordem || "data_desc";
  lista = [...lista].sort((a, b) => {
    if (ordem === "odd_desc") return Number(b.odd_bilhete || 0) - Number(a.odd_bilhete || 0);
    if (ordem === "odd_asc") return Number(a.odd_bilhete || 0) - Number(b.odd_bilhete || 0);
    if (ordem === "valor_desc") return Number(b.valor_apostado || 0) - Number(a.valor_apostado || 0);
    if (ordem === "valor_asc") return Number(a.valor_apostado || 0) - Number(b.valor_apostado || 0);
    return dataDoBilhete(b) - dataDoBilhete(a);
  });
  return lista;
}
