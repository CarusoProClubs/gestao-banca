import "./globals.css";
import Nav from "../components/Nav";

export const metadata = { title: "Gestão de Banca" };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <main>
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
