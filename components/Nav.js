"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Notificacoes from "./Notificacoes";

const LINKS = [
  ["/", "⌂", "Painel"],
  ["/analise", "▦", "Análise"],
  ["/importar", "＋", "Novo"],
  ["/boletim", "▤", "Boletim"],
  ["/alavancagem", "↗", "Alavancagem"],
  ["/relatorio", "▥", "Relatório"],
  ["/config", "⚙", "Config"],
];

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("Seu nome");
  const [age, setAge] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftAge, setDraftAge] = useState("");
  const profileRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gestao-banca-profile") || "{}");
      if (saved.name) setName(saved.name);
      if (saved.age) setAge(saved.age);
    } catch {}
  }, []);

  useEffect(() => {
    function close(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function startEditing() {
    setDraftName(name === "Seu nome" ? "" : name);
    setDraftAge(age);
    setEditing(true);
  }

  function saveProfile() {
    const nextName = draftName.trim() || "Seu nome";
    const nextAge = draftAge.trim();
    setName(nextName);
    setAge(nextAge);
    localStorage.setItem("gestao-banca-profile", JSON.stringify({ name: nextName, age: nextAge }));
    setEditing(false);
  }

  return (
    <>
      <header className="topbar">
        <Link href="/" className="topbar-brand" aria-label="Ir para o Painel">
          <span className="brand-mark">GB</span>
          <span>
            <strong>Gestão de Banca</strong>
            <small>{name}</small>
          </span>
        </Link>

        <div className="topbar-actions">
          <Notificacoes />
          <div className="profile-wrap" ref={profileRef}>
            <button className="profile-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
              <span className="profile-avatar">{name.charAt(0).toUpperCase()}</span>
              <span className="profile-label">
                <small>Perfil</small>
                <strong>{name}</strong>
              </span>
              <span className="profile-chevron">⌄</span>
            </button>

            {open && (
              <div className="profile-menu">
                <div className="profile-menu-head">
                  <div className="profile-avatar profile-avatar-lg">{name.charAt(0).toUpperCase()}</div>
                  <div>
                    <strong>{name}</strong>
                    <span>{age ? `${age} anos` : "Perfil não configurado"}</span>
                  </div>
                </div>

                {editing ? (
                  <div className="profile-edit">
                    <label>Nome</label>
                    <input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={40} />
                    <label>Idade</label>
                    <input value={draftAge} onChange={(event) => setDraftAge(event.target.value.replace(/\D/g, "").slice(0, 3))} inputMode="numeric" />
                    <div className="profile-edit-actions">
                      <button type="button" onClick={() => setEditing(false)}>Cancelar</button>
                      <button type="button" className="profile-save" onClick={saveProfile}>Salvar</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="profile-info">
                      <div><span>Nome</span><strong>{name}</strong></div>
                      <div><span>Idade</span><strong>{age ? `${age} anos` : "Não informada"}</strong></div>
                      <div><span>Acesso</span><strong className="profile-status">Sessão local</strong></div>
                    </div>
                    <button className="profile-action" type="button" onClick={startEditing}>Editar perfil</button>
                    <button className="profile-login" type="button">Entrar / criar conta</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="bottom-nav" aria-label="Navegação principal">
        <div className="bottom-nav-inner">
          {LINKS.map(([href, icon, label]) => (
            <Link key={href} href={href} className={path === href ? "active" : ""}>
              <span className="bottom-nav-icon" aria-hidden="true">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
