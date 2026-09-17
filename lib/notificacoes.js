export async function publicarAviso(supabase, { tipo, titulo, corpo, link = "/alavancagem", inicio_semana }) {
  if (!supabase) return { error: new Error("Sem Supabase") };
  const { data, error } = await supabase
    .from("app_notifications")
    .insert({
      tipo,
      titulo,
      corpo,
      link,
      inicio_semana: inicio_semana || null,
    })
    .select("id")
    .single();
  return { data, error };
}

export function textoTipo(tipo) {
  if (tipo === "tabela_semana") return "Tabela da semana";
  if (tipo === "alteracao") return "Alteração";
  return "Aviso";
}
