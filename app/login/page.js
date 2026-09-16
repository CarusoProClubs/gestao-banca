"use client";

import { useState } from "react";
import { getSupabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit(mode) {
    const supabase = getSupabase();
    if (!supabase) {
      setMsg("Faltou configurar o Supabase no .env.local");
      return;
    }
    setMsg("Aguarde...");
    const action =
      mode === "signup"
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password });
    const { error } = await action;
    setMsg(error ? error.message : mode === "signup" ? "Conta criada. Se pedir confirmação, veja o e-mail. Depois entre." : "Entrou. Abra o Painel.");
    if (!error && mode === "login") window.location.href = "/";
  }

  return (
    <section className="card">
      <h2>Entrar</h2>
      <p>O primeiro cadastro cria a sua organização. Clientes futuros repetem o mesmo fluxo.</p>
      <p>E-mail</p>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <p>Senha (mínimo 6)</p>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <p>
        <button onClick={() => submit("login")}>Entrar</button>{" "}
        <button onClick={() => submit("signup")}>Criar conta</button>
      </p>
      <p>{msg}</p>
    </section>
  );
}
