import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { interpretarBilhete } from "../../../lib/leitor-aposta";
import { validarLeitura } from "../../../lib/validar-leitura";
import { validarResultadosBilhete } from "../../../lib/validar-aposta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function supabaseAdminless() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(request) {
  try {
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return NextResponse.json({ error: "Sessão não encontrada." }, { status: 401 });

    const supabase = supabaseAdminless();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return NextResponse.json({ error: "Sessão inválida ou expirada." }, { status: 401 });

    const form = await request.formData();
    const files = form.getAll("files").filter((file) => file && typeof file.arrayBuffer === "function");
    if (!files.length) return NextResponse.json({ error: "Selecione pelo menos uma imagem." }, { status: 400 });

    const leitura = validarLeitura(await interpretarBilhete(files));

    // Nunca bloqueia a leitura do comprovante por consultas esportivas externas.
    // A validação de resultado é uma etapa posterior e explícita.
    const validar = new URL(request.url).searchParams.get("validar") === "1";
    if (!validar) {
      return NextResponse.json({ ok: true, bilhete: leitura, validacao_pendente: true });
    }

    const result = await validarResultadosBilhete(leitura);
    return NextResponse.json({ ok: true, bilhete: validarLeitura(result), validacao_pendente: false });
  } catch (error) {
    console.error("[ler-bilhete]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao interpretar o bilhete." },
      { status: 500 }
    );
  }
}
