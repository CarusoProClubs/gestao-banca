"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabase";

export default function ConfigPage() {
  const [form, setForm] = useState({
    salario_mensal: 5000,
    percentual_lazer: 0.08,
    stake_padrao: 0.02,
    meta_lucro: 0.2,
  });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.from("bankroll_settings").select("*").limit(1).then(({ data }) => {
      if (data?.[0]) setForm(data[0]);
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
    const { error } = await supabase.from("bankroll_settings").upsert({
      organization_id: profile.organization_id,
      salario_mensal: Number(form.salario_mensal),
      percentual_lazer: Number(form.percentual_lazer),
      stake_padrao: Number(form.stake_padrao),
      meta_lucro: Number(form.meta_lucro),
    });
    setMsg(error ? error.message : "Salvo");
  }

  return (
    <section className="card">
      <h2>Configuração da banca</h2>
      <p>Salário mensal</p>
      <input
        value={form.salario_mensal}
        onChange={(e) => setForm({ ...form, salario_mensal: e.target.value })}
      />
      <p>% lazer / apostas (0.08 = 8%)</p>
      <input
        value={form.percentual_lazer}
        onChange={(e) => setForm({ ...form, percentual_lazer: e.target.value })}
      />
      <p>Stake padrão (0.02 = 2%)</p>
      <input
        value={form.stake_padrao}
        onChange={(e) => setForm({ ...form, stake_padrao: e.target.value })}
      />
      <p>
        <button onClick={save}>Salvar</button>
      </p>
      <p>{msg}</p>
    </section>
  );
}
