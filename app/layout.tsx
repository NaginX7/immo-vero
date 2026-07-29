import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  // Outil de gestion interne : aucune page ne doit apparaître dans les moteurs
  // de recherche. S'applique à toutes les pages, y compris /rdv et les liens de
  // confirmation de rendez-vous.
  robots: { index: false, follow: false, nocache: true },
  title: "Giorgio Immo — L'Immobilière de Saverne",
  description: "CRM métier pour mandataire immobilière indépendante",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
