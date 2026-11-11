import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/lib/store";
import { AppFrame } from "@/components/AppFrame";

export const metadata: Metadata = {
  title: "Boutika — Gestion PME CEMAC",
  description:
    "Gestion simple des boutiques, stock en temps réel, facturation et paiements Mobile Money pour les PME de la CEMAC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <Providers>
          <AppFrame>{children}</AppFrame>
        </Providers>
      </body>
    </html>
  );
}
