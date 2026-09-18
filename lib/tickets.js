import { fecharBilhete } from "./resultado";

function timestampValido(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : valor;
}

export async function salvarBilhete(supabase, profile, userId, json) {
  const fechado = fecharBilhete(json);
  if (!fechado.casa) return { error: new Error("Casa de aposta não informada.") };
  if (!fechado.valor_apostado || Number(fechado.valor_apostado) <= 0) {
    return { error: new Error("Valor apostado inválido.") };
  }
  if (fechado.status_usuario === "cashout" && (fechado.valor_resgatado == null || Number(fechado.valor_resgatado) < 0)) {
    return { error: new Error("Informe o valor resgatado do cashout antes de salvar.") };
  }

  const ticket = {
    organization_id: profile.organization_id,
    created_by: userId,
    casa: fechado.casa ?? null,
    id_casa: fechado.id_casa ?? null,
    codigo_booking: fechado.codigo_booking ?? null,
    data_hora: timestampValido(fechado.data_hora),
    tipo: fechado.tipo ?? null,
    formato: fechado.formato ?? null,
    titulo: fechado.titulo ?? null,
    valor_apostado: fechado.valor_apostado ?? null,
    moeda: fechado.moeda ?? "BRL",
    odd_bilhete: fechado.odd_bilhete ?? null,
    retorno_casa: fechado.retorno_casa ?? null,
    valor_resgatado: fechado.valor_resgatado ?? null,
    status_print: fechado.status_print ?? fechado.status_detectado ?? "pendente",
    status_usuario: fechado.status_usuario,
    lucro: fechado.lucro,
    esporte: fechado.esporte ?? null,
    jogo: fechado.jogo ?? null,
    payload: fechado.payload || fechado,
  };

  const { data: saved, error } = await supabase.from("tickets").insert(ticket).select("id").single();
  if (error) return { error };

  const legs = Array.isArray(fechado.pernas) ? fechado.pernas : [];
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
    if (legError) {
      await supabase.from("tickets").delete().eq("id", saved.id);
      return { error: legError };
    }
  }

  return { id: saved.id };
}
