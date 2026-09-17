import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { interpretarBilhete } from "../../../lib/leitor-aposta";
import { validarResultadosBilhete } from "../../../lib/validar-aposta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const leitura = await interpretarBilhete(files);
    const result = await validarResultadosBilhete(leitura);
    return NextResponse.json({ ok: true, bilhete: result });
  } catch (error) {
    console.error("[ler-bilhete]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao interpretar o bilhete." }, { status: 500 });
  }
}
