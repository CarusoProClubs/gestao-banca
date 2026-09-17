import "./globals.css";
import Nav from "../components/Nav";

export const metadata = { title: "Gestão de Banca" };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div className="bg" />
        <main>
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
