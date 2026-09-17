"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "../../../lib/supabase";
import { NIVEIS, inicioSemana } from "../../../lib/alavancagem";
import { publicarAviso } from "../../../lib/notificacoes";
import { limitarX, parseTxtSemana } from "../../../lib/txt-semana";

export default function SemanaAdminPage() {
  const semana = inicioSemana();
  const [admin, setAdmin] = useState(false);
  const [plano, setPlano] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [xs, setXs] = useState({ segura: 4, media: 7, alta: 12 });
  const [preview, setPreview] = useState(null);
  const [arquivoNome, setArquivoNome] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return setMsg("Entre em /login");
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
    setAdmin(profile?.role === "admin");
    const { data: plans } = await supabase.from("weekly_plans").select("*").eq("inicio", semana).limit(1);
    const plan = plans?.[0] || null;
    setPlano(plan);
    if (plan) {
      setXs({
        segura: Number(plan.x_baixa || 4),
        media: Number(plan.x_media || 7),
        alta: Number(plan.x_alta || 12),
      });
    }
    const { data: evs } = await supabase.from("weekly_events").select("*").eq("inicio", semana).order("data_evento", { ascending: true });
    setEventos(evs ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function lerArquivo(file) {
    if (!file) return;
    setArquivoNome(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseTxtSemana(String(reader.result || ""), semana);
      setPreview(parsed);
      setXs({
        segura: parsed.x_baixa,
        media: parsed.x_media,
        alta: parsed.x_alta,
      });
      setMsg(parsed.erros.length ? `Li o arquivo, mas tem ${parsed.erros.length} linha(s) com problema.` : `Arquivo lido: ${parsed.eventos.length} evento(s).`);
    };
    reader.readAsText(file, "utf-8");
  }

  async function gravarEPublicar() {
    const supabase = getSupabase();
    const lista = preview?.eventos?.length ? preview.eventos : null;
    const payload = {
      inicio: semana,
      nivel: "triplo",
      multiplo_min: xs.segura,
      multiplo_max: xs.alta,
      qtd_eventos: (lista || eventos.filter((e) => e.status !== "cancelado")).length,
      status: "publicado",
      nota: `X|${xs.segura}|${xs.media}|${xs.alta}`,
      x_baixa: xs.segura,
      x_media: xs.media,
      x_alta: xs.alta,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    let { error } = plano
      ? await supabase.from("weekly_plans").update(payload).eq("id", plano.id)
      : await supabase.from("weekly_plans").insert(payload);
    if (error && /x_baixa|column/i.test(error.message)) {
      const { x_baixa, x_media, x_alta, ...semColuna } = payload;
      const again = plano
        ? await supabase.from("weekly_plans").update(semColuna).eq("id", plano.id)
        : await supabase.from("weekly_plans").insert(semColuna);
      error = again.error;
    }
    if (error) return setMsg(error.message);

    if (lista) {
      await supabase.from("weekly_events").delete().eq("inicio", semana);
      const rows = lista.map((ev) => ({ ...ev, inicio: semana }));
      const ins = await supabase.from("weekly_events").insert(rows);
      if (ins.error) return setMsg(ins.error.message);
    }

    await publicarAviso(supabase, {
      tipo: "tabela_semana",
      titulo: "Tabela da semana disponível",
      corpo: `Baixo ${xs.segura}x · Médio ${xs.media}x · Alto ${xs.alta}x. Veja os eventos e informe o valor.`,
      link: "/alavancagem",
      inicio_semana: semana,
    });
    setPreview(null);
    setMsg("Tabela publicada e aviso enviado no app.");
    load();
  }

  async function alterar(ev, patch, avisar) {
    const supabase = getSupabase();
    const { error } = await supabase.from("weekly_events").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", ev.id);
    if (error) return setMsg(error.message);
    if (avisar) {
      await publicarAviso(supabase, {
        tipo: "alteracao",
        titulo: patch.status === "cancelado" ? "Evento removido da tabela" : "Alteração na tabela da semana",
        corpo: `${ev.evento}${patch.motivo_alteracao ? ` — ${patch.motivo_alteracao}` : ""}`,
        link: "/alavancagem",
        inicio_semana: semana,
      });
    }
    setMsg(avisar ? "Alteração publicada e aviso enviado." : "Salvo.");
    load();
  }

  if (!admin) {
    return (
      <section className="card">
        <h2>Tabela da semana</h2>
        <p>Só o admin publica a grade. Cliente vê em <Link href="/alavancagem">Alavancagem</Link>.</p>
        <p>{msg}</p>
      </section>
    );
  }

  return (
    <section>
      <section className="card">
        <h2>X desta semana (os três níveis entram juntos)</h2>
        <p>Semana de {semana.split("-").reverse().join("/")}.</p>
        <p className="muted">Baixo só aceita 3 a 5. Médio 6 a 9. Alto 10 a 15. O número do meio é o X desta semana.</p>
        <div className="filters">
          {Object.values(NIVEIS).map((n) => (
            <div key={n.id}>
              <p>{n.nome} ({n.multiploMin}x–{n.multiploMax}x)</p>
              <input
                value={xs[n.id]}
                onChange={(e) => setXs({ ...xs, [n.id]: limitarX(n.id, e.target.value, xs[n.id]) })}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Enviar arquivo TXT da semana</h2>
        <p>Um arquivo só, com os três níveis. <a href="/modelo-semana.txt" download>Baixar modelo</a></p>
        <input type="file" accept=".txt,text/plain" onChange={(e) => lerArquivo(e.target.files?.[0])} />
        {arquivoNome && <p className="muted">Arquivo: {arquivoNome}</p>}
        {preview && (
          <div>
            <p>{preview.eventos.length} evento(s) lidos · baixo {preview.x_baixa}x · médio {preview.x_media}x · alto {preview.x_alta}x</p>
            {preview.erros.map((err) => <p key={err} className="bad">{err}</p>)}
            {preview.eventos.slice(0, 8).map((ev, i) => (
              <p key={i} className="muted">{NIVEIS[ev.nivel]?.nome} · {ev.data_evento || "sem data"} · {ev.evento} · {ev.mercado} · {ev.odd_sugerida || "—"}</p>
            ))}
          </div>
        )}
        <p>
          <button className="green" onClick={gravarEPublicar}>Publicar tabela e avisar no app</button>
        </p>
        <p>{msg}</p>
      </section>

      <section className="card">
        <h2>Grade atual</h2>
        {eventos.length === 0 && <p className="muted">Ainda vazia. Envie o TXT e publique.</p>}
        {eventos.map((ev) => (
          <div className="leg" key={ev.id}>
            <strong>{NIVEIS[ev.nivel]?.nome || ev.nivel} · {ev.evento}</strong>
            <p className="muted">
              {[ev.data_evento, ev.horario, ev.esporte, ev.mercado, ev.odd_sugerida, ev.status].filter(Boolean).join(" · ")}
            </p>
            {ev.motivo_alteracao && <p className="muted">Alteração: {ev.motivo_alteracao}</p>}
            <p>
              <button onClick={() => {
                const motivo = window.prompt("O que mudou? (sai no aviso)", ev.motivo_alteracao || "");
                if (motivo == null) return;
                alterar(ev, { status: "alterado", motivo_alteracao: motivo }, true);
              }}>Registrar alteração e avisar</button>{" "}
              <button className="red" onClick={() => {
                const motivo = window.prompt("Por que sai da tabela?", "Mudança no jogo");
                if (motivo == null) return;
                alterar(ev, { status: "cancelado", motivo_alteracao: motivo }, true);
              }}>Cancelar e avisar</button>
            </p>
          </div>
        ))}
      </section>
    </section>
  );
}
