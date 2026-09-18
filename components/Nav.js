"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Notificacoes from "./Notificacoes";

const LINKS = [
  ["/", "⌂", "Painel"],
  ["/analise", "▦", "Análise"],
  ["/alavancagem", "↗", "Alavancagem"],
  ["/boletim", "▤", "Boletim"],
  ["/relatorio", "▥", "Relatório"],
  ["/importar", "＋", "Novo bilhete"],
  ["/config", "⚙", "Config"],
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav aria-label="Navegação principal">
      <Link href="/" className="brand">Gestão de Banca</Link>
      <div className="nav-links">
        {LINKS.map(([href, icon, label]) => (
          <Link key={href} href={href} className={path === href ? "active" : ""}>
            <span aria-hidden="true">{icon}</span><span>{label}</span>
          </Link>
        ))}
      </div>
      <Notificacoes />
    </nav>
  );
}
