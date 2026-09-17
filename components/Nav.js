"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Notificacoes from "./Notificacoes";

const LINKS = [
  ["/", "Painel"],
  ["/analise", "Análise"],
  ["/alavancagem", "Alavancagem"],
  ["/boletim", "Boletim"],
  ["/relatorio", "Relatório"],
  ["/importar", "Enviar print"],
  ["/config", "Config"],
  ["/login", "Entrar"],
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav>
      <strong className="brand">Gestão de Banca</strong>
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={path === href ? "active" : ""}>
          {label}
        </Link>
      ))}
      <Notificacoes />
    </nav>
  );
}
