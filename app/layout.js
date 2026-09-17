import "./globals.css";
import Link from "next/link";

export const metadata = { title: "Gestão de Banca" };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <main>
          <nav>
            <strong>Gestão de Banca</strong>
            <Link href="/">Painel</Link>
            <Link href="/analise">Análise</Link>
            <Link href="/alavancagem">Alavancagem</Link>
            <Link href="/boletim">Boletim</Link>
            <Link href="/relatorio">Relatório</Link>
            <Link href="/importar">Enviar print</Link>
            <Link href="/config">Config</Link>
            <Link href="/login">Entrar</Link>
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
