export async function salvarBilhete(supabase, profile, userId, json) {
  const ticket = {
    organization_id: profile.organization_id,
    created_by: userId,
    casa: json.casa ?? null,
    id_casa: json.id_casa ?? null,
    codigo_booking: json.codigo_booking ?? null,
    data_hora: json.data_hora ?? null,
    tipo: json.tipo ?? null,
    formato: json.formato ?? null,
    titulo: json.titulo ?? null,
    valor_apostado: json.valor_apostado ?? null,
    moeda: json.moeda ?? "BRL",
    odd_bilhete: json.odd_bilhete ?? null,
    retorno_casa: json.retorno_casa ?? null,
    status_print: json.status_print ?? "pendente",
    status_usuario: "pendente",
    esporte: json.esporte ?? null,
    jogo: json.jogo ?? null,
    payload: json,
  };
  const { data: saved, error } = await supabase.from("tickets").insert(ticket).select("id").single();
  if (error) return { error };
  const legs = Array.isArray(json.pernas) ? json.pernas : [];
  if (legs.length) {
    const rows = legs.map((perna, index) => ({
      organization_id: profile.organization_id,
      ticket_id: saved.id,
      ordem: perna.ordem ?? index + 1,
      jogo: perna.jogo ?? null,
      selecao: perna.selecao ?? null,
      mercado: perna.mercado ?? null,
      odd_perna: perna.odd_perna ?? null,
      placar_print: perna.placar_print ?? null,
      status_print: perna.status_print ?? "desconhecido",
    }));
    const { error: legError } = await supabase.from("ticket_legs").insert(rows);
    if (legError) return { error: legError };
  }
  return { id: saved.id };
}
