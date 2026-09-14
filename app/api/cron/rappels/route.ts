import { NextResponse, type NextRequest } from "next/server";

import { envoyerRappels } from "@/lib/rappels";

export const dynamic = "force-dynamic";
// Laisse le temps d'envoyer plusieurs emails à la suite.
export const maxDuration = 60;

/**
 * Envoi des rappels de rendez-vous (48 h avant).
 *
 * Déclenchée par la tâche planifiée Vercel, qui présente automatiquement
 * l'en-tête `Authorization: Bearer $CRON_SECRET`. Sans secret configuré, la
 * route refuse de s'exécuter : personne ne doit pouvoir déclencher des envois.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET n'est pas configuré." },
      { status: 500 }
    );
  }

  const entete = req.headers.get("authorization");
  const fourni =
    entete?.replace(/^Bearer\s+/i, "") ??
    req.nextUrl.searchParams.get("secret") ??
    "";

  // Comparaison à temps constant
  let diff = fourni.length === secret.length ? 0 : 1;
  for (let i = 0; i < Math.max(fourni.length, secret.length); i++) {
    diff |= (fourni.charCodeAt(i) || 0) ^ (secret.charCodeAt(i) || 0);
  }
  if (diff !== 0) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Les liens des rappels pointent vers le domaine public de prise de RDV.
  const base =
    (process.env.PUBLIC_URL || process.env.APP_URL)?.trim().replace(/\/+$/, "") ??
    `https://${req.headers.get("host") ?? "localhost:3000"}`;

  const resultat = await envoyerRappels(base);

  return NextResponse.json(
    { ok: true, ...resultat },
    { headers: { "Cache-Control": "no-store" } }
  );
}
