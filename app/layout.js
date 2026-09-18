import "./globals.css";
import Nav from "../components/Nav";
import PwaRegister from "../components/PwaRegister";
import InstallAppPrompt from "../components/InstallAppPrompt";
import InstallAppPrompt from "../components/InstallAppPrompt";

export const metadata = {
  title: "Gestão de Banca",
  description: "Gestão e acompanhamento de apostas esportivas.",
  applicationName: "Gestão de Banca",
  manifest: "/manifest.webmanifest",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Gestão de Banca", statusBarStyle: "black-translucent" }
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <PwaRegister />
        <InstallAppPrompt />
        <InstallAppPrompt />
        <div className="bg" />
        <main>
          <Nav />
          {children}
        </main>
      </body>
    </html>
  );
}
