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
            <Link href="/bilhetes">Bilhetes</Link>
            <Link href="/importar">Importar JSON</Link>
            <Link href="/config">Config</Link>
          </nav>
          {children}
        </main>
      </body>
    </html>
  );
}
