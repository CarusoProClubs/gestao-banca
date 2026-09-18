"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";

const DISMISS_KEY = "gestao-banca-install-dismissed";
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000;

export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (standalone) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL) return;

    const isIOS =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    if (isIOS) {
      setIos(true);
      setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <aside className="install-app-prompt" role="dialog" aria-label="Instalar Gestão de Banca">
      <div className="install-app-icon"><Icon name="download" size={21} /></div>
      <div className="install-app-copy">
        <strong>Leve o Gestão de Banca com você</strong>
        {ios ? (
          <span>No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.</span>
        ) : (
          <span>Instale o app para abrir mais rápido e ter uma experiência melhor no celular.</span>
        )}
      </div>
      <div className="install-app-actions">
        {!ios && <button type="button" className="install-app-button" onClick={install}>Instalar</button>}
        <button type="button" className="install-app-dismiss" onClick={dismiss}>Agora não</button>
      </div>
    </aside>
  );
}
