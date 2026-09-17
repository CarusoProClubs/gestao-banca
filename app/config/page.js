"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { NIVEIS } from "../../lib/alavancagem";

export default function ConfigPage() {
  const [form, setForm] = useState({
    salario_mensal: 5000,
    percentual_lazer: 0.08,
    stake_padrao: 0.02,
    meta_lucro: 0.2,
    periodicidade: "mensal",
    nivel_risco: "segura",
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.from("bankroll_settings").select("*").limit(1).then(({ data }) => {
      if (data?.[0]) setForm({ periodicidade: "mensal", nivel_risco: "segura", ...data[0] });
    });
  }, []);

  async function save() {
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return setMsg("Entre em /login");
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", userData.user.id)
      .single();
    const payload = {
      organization_id: profile.organization_id,
      salario_mensal: Number(form.salario_mensal),
      percentual_lazer: Number(form.percentual_lazer),
      stake_padrao: Number(form.stake_padrao),
      meta_lucro: Number(form.meta_lucro),
      periodicidade: form.periodicidade,
      nivel_risco: form.nivel_risco,
    };
    const { error } = await supabase.from("bankroll_settings").upsert(payload);
    setMsg(error ? error.message : "Salvo");
  }

  return (
    <section className="card">
      <h2>Configuração da banca</h2>
      <p>Como você recebe</p>
      <select value={form.periodicidade} onChange={(e) => setForm({ ...form, periodicidade: e.target.value })}>
        <option value="semanal">Semanal</option>
        <option value="quinzenal">Quinzenal</option>
        <option value="mensal">Mensal</option>
      </select>
      <p>Salário mensal (R$)</p>
      <input value={form.salario_mensal} onChange={(e) => setForm({ ...form, salario_mensal: e.target.value })} />
      <p>% lazer / apostas (0.08 = 8%)</p>
      <input value={form.percentual_lazer} onChange={(e) => setForm({ ...form, percentual_lazer: e.target.value })} />
      <p>Alavancagem</p>
      <select value={form.nivel_risco} onChange={(e) => setForm({ ...form, nivel_risco: e.target.value })}>
        {Object.values(NIVEIS).map((nivel) => (
          <option key={nivel.id} value={nivel.id}>{nivel.nome}</option>
        ))}
      </select>
      <p>{NIVEIS[form.nivel_risco]?.texto}</p>
      <p>
        <button onClick={save}>Salvar</button>
      </p>
      <p>{msg}</p>
    </section>
  );
}
