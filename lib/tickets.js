import { fecharBilhete } from "./resultado";
import { validarFinanceiro } from "./types";

function timestampValido(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : valor;
}

function statusPrintDoBilhete(fechado) {
  if (fechado.status_usuario === "green") return "green";
  if (fechado.status_usuario === "red") return "red";
  if (fechado.status_usuario === "anulada") return "anulada";
  if (fechado.status_usuario === "cashout") return "cashout";
  return fechado.status_detectado || "pendente";
}

export async function salvarBilhete(supabase, profile, userId, json) {
  const fechado = fecharBilhete(json);
  const erros = validarFinanceiro(fechado);

  if (!fechado.casa) erros.push("Casa de aposta não informada.");
  if (!timestampValido(fechado.data_hora)) erros.push("Data e hora do bilhete não informadas ou inválidas.");
  if (!fechado.valor_apostado || Number(fechado.valor_apostado) <= 0) erros.push("Valor apostado inválido.");
  if (!Array.isArray(fechado.pernas)) erros.push("Estrutura de palpites inválida.");

  const uniqueErrors = [...new Set(erros)];
  if (uniqueErrors.length) return { error: new Error(uniqueErrors.join(" ")) };

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
    status_print: statusPrintDoBilhete(fechado),
    status_usuario: fechado.status_usuario,
    lucro: fechado.lucro,
    esporte: fechado.esporte ?? null,
    jogo: fechado.jogo ?? null,
    // Snapshot do objeto EXATAMENTE como foi revisado antes do salvamento.
    payload: { ...fechado, pernas: fechado.pernas },
  };

  const { data: saved, error } = await supabase.from("tickets").insert(ticket).select("id").single();
  if (error) return { error };

  const legs = fechado.pernas.map((perna, index) => ({
    organization_id: profile.organization_id,
    ticket_id: saved.id,
    ordem: Number(perna.ordem) || index + 1,
    jogo: perna.jogo ?? null,
    selecao: perna.selecao ?? null,
    mercado: perna.mercado ?? null,
    odd_perna: perna.odd_perna ?? null,
    placar_print: perna.placar_print ?? null,
    status_print:
      perna.status_usuario === "green" ? "acertou" :
      perna.status_usuario === "red" ? "errou" :
      perna.status_usuario === "anulada" ? "anulada" :
      perna.status_print ?? "desconhecido",
  }));

  if (legs.length) {
    const { error: legError } = await supabase.from("ticket_legs").insert(legs);
    if (legError) {
      await supabase.from("tickets").delete().eq("id", saved.id);
      return { error: legError };
    }
  }

  return { id: saved.id };
}
