import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

import { resolveBookingByToken } from "@/lib/calendar-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirmation de rendez-vous — L'Immobilière de Saverne",
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const token = one(searchParams.token);
  const action = one(searchParams.action) === "annuler" ? "annuler" : "confirmer";

  const res = await resolveBookingByToken(token, action);

  const contenu = {
    confirme: {
      icon: CheckCircle2,
      tone: "text-emerald-600",
      box: "border-emerald-200 bg-emerald-50",
      titre: "Merci, votre présence est confirmée !",
      texte: res.quand
        ? `Nous avons noté votre rendez-vous du ${res.quand}. À très bientôt !`
        : "Votre rendez-vous est confirmé.",
    },
    deja_confirme: {
      icon: CheckCircle2,
      tone: "text-emerald-600",
      box: "border-emerald-200 bg-emerald-50",
      titre: "Votre présence était déjà confirmée",
      texte: res.quand
        ? `Rendez-vous du ${res.quand}. À très bientôt !`
        : "Ce rendez-vous est déjà confirmé.",
    },
    annule: {
      icon: XCircle,
      tone: "text-navy-500",
      box: "border-border bg-muted",
      titre: "Votre rendez-vous a bien été annulé",
      texte:
        "Le créneau est de nouveau disponible. N'hésitez pas à en réserver un autre quand vous le souhaitez.",
    },
    deja_annule: {
      icon: XCircle,
      tone: "text-navy-500",
      box: "border-border bg-muted",
      titre: "Ce rendez-vous a déjà été annulé",
      texte:
        "Le créneau est de nouveau disponible. Vous pouvez en réserver un autre.",
    },
    introuvable: {
      icon: AlertCircle,
      tone: "text-amber-600",
      box: "border-amber-200 bg-amber-50",
      titre: "Ce lien n'est plus valide",
      texte:
        "Le lien de confirmation est incorrect ou a expiré. Vous pouvez reprendre un rendez-vous ci-dessous.",
    },
  }[res.etat];

  const Icon = contenu.icon;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-navy-800 bg-navy-900 py-6 text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-lg font-bold">
            IS
          </div>
          <div>
            <p className="font-semibold">L&apos;Immobilière de Saverne</p>
            <p className="text-sm text-navy-300">
              Véronique Noureddine · Mandataire immobilière
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <div className={`rounded-xl border p-8 text-center ${contenu.box}`}>
          <Icon className={`mx-auto h-14 w-14 ${contenu.tone}`} />
          <h1 className="mt-5 font-serif text-2xl font-bold tracking-tight text-navy-800">
            {contenu.titre}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{contenu.texte}</p>

          {(res.etat === "annule" ||
            res.etat === "deja_annule" ||
            res.etat === "introuvable") && (
            <Link
              href="/rdv"
              className="mt-6 inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-coral-500"
            >
              Prendre un nouveau rendez-vous
            </Link>
          )}
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          L&apos;Immobilière de Saverne · Réseau BSK · Saverne (67700)
        </p>
      </div>
    </div>
  );
}
