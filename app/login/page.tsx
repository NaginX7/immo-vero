import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connexion — L'Immobilière de Saverne",
  robots: { index: false, follow: false },
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export default function LoginPage({ searchParams }: { searchParams: SP }) {
  const from = one(searchParams.from);
  const configManquante = one(searchParams.config) === "manquante";

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-xl font-bold text-white">
            IS
          </div>
          <p className="mt-4 text-lg font-semibold text-white">
            L&apos;Immobilière de Saverne
          </p>
          <p className="text-sm text-navy-300">Espace de gestion</p>
        </div>

        {configManquante ? (
          <div className="rounded-xl bg-white p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-sm">
                <p className="font-semibold text-navy-800">
                  Configuration incomplète
                </p>
                <p className="mt-1 text-muted-foreground">
                  Aucun mot de passe n&apos;est défini sur le serveur. Par
                  sécurité, l&apos;accès aux données est bloqué.
                </p>
                <p className="mt-2 text-muted-foreground">
                  Définissez la variable d&apos;environnement{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-xs">
                    APP_PASSWORD
                  </code>{" "}
                  puis redéployez.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <LoginForm from={from} />
        )}

        <p className="mt-6 text-center text-xs text-navy-400">
          Accès réservé. Vos données clients sont protégées.
        </p>
      </div>
    </div>
  );
}
