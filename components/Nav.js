"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import Notificacoes from "./Notificacoes";
import Icon from "./Icon";

const LINKS=[
  ["/","home","Painel"],
  ["/analise","chart","Análise"],
  ["/importar","plus","Novo"],
  ["/boletim","newspaper","Boletim"],
  ["/alavancagem","bolt","Alavancagem"],
  ["/relatorio","report","Relatório"]
];

export default function Nav(){
  const path=usePathname();
  return (
    <>
      <header className="topbar">
        <Link href="/" className="topbar-brand">
          <span className="brand-mark">GB</span>
          <span><strong>Gestão de Banca</strong><small>Gestão e controle</small></span>
        </Link>
        <div className="topbar-actions">
          <Notificacoes/>
          <Link href="/perfil" className="profile-button">
            <span className="profile-avatar"><Icon name="user" size={18}/></span>
            <span className="profile-label"><small>Perfil</small><strong>Meu perfil</strong></span>
          </Link>
        </div>
      </header>

      <nav className="bottom-nav">
        <div className="bottom-nav-inner">
          {LINKS.map(([href,icon,label])=>(
            <Link key={href} href={href} className={path===href?"active":""}>
              <Icon name={icon} size={17}/>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
