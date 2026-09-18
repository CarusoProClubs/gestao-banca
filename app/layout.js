import "./globals.css";
import Nav from "../components/Nav";
import PwaRegister from "../components/PwaRegister";

export const metadata = {
  title: "Gestão de Banca",
  description: "Gestão e acompanhamento de apostas esportivas.",
  applicationName: "Gestão de Banca",
  appleWebApp: { capable: true, title: "Gestão de Banca", statusBarStyle: "black-translucent" }
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <PwaRegister />
        <div className="bg" />
        <main>
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
