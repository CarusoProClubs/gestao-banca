import { fecharBilhete } from "./resultado";
import { validarFinanceiro } from "./types";

function timestampValido(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : valor;
}

function statusPrintDoBilhete(fechado) {
  const status = fechado.status_print ?? fechado.status_detectado;
  return ["acertou", "errou", "anulada", "desconhecido"].includes(status)
    ? status
    : "desconhecido";
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
    status_print: fechado.status_print ?? fechado.status_detectado ?? "desconhecido",
    status_usuario: fechado.status_usuario,
    esporte: fechado.esporte ?? null,
    jogo: fechado.jogo ?? null,
    payload: { ...fechado, pernas: fechado.pernas },
    lucro: fechado.lucro,
  };

  const { data: id, error } = await supabase.rpc("salvar_bilhete_atomico", {
    p_ticket: ticket,
    p_pernas: fechado.pernas,
  });

  if (error) return { error };

  return { id };
}
