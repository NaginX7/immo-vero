import { Resend } from "resend";

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const DEFAULT_FROM = "L'Immobilière de Saverne <onboarding@resend.dev>";

/**
 * Variable d'environnement nettoyée : espaces et guillemets englobants retirés.
 * Dans Vercel, les guillemets saisis font partie de la valeur (contrairement au
 * fichier .env) ; un RESEND_FROM entre guillemets a déjà bloqué tous les envois.
 */
function env(name: string): string | undefined {
  const v = process.env[name]?.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  return v ? v : undefined;
}

/**
 * Adresse de réponse.
 *
 * Resend authentifie des DOMAINES, pas des adresses isolées : on ne peut donc
 * pas expédier depuis une adresse d'un domaine que l'on ne contrôle pas
 * (ex. @bskimmobilier.com, propriété du réseau). L'usage est d'expédier depuis
 * son propre domaine vérifié et de renvoyer les réponses vers l'adresse
 * habituelle via RESEND_REPLY_TO : le client répond, le message arrive dans la
 * boîte BSK.
 */
function replyToAddress(): string | undefined {
  return env("RESEND_REPLY_TO");
}

/**
 * Copie cachée de chaque email envoyé (confirmations, rappels, envois
 * manuels), pour en garder une trace dans la boîte habituelle. Invisible pour
 * le destinataire. Plusieurs adresses possibles, séparées par des virgules.
 */
function bccAddresses(): string[] {
  return (env("RESEND_BCC") ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

/** Envoie un email via Resend. Ne jette jamais : renvoie un résultat typé. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const key = env("RESEND_API_KEY");
  if (!key) {
    return {
      ok: false,
      error:
        "Clé API Resend absente. Renseignez RESEND_API_KEY dans le fichier .env.",
    };
  }

  const from = env("RESEND_FROM") ?? DEFAULT_FROM;
  const replyTo = opts.replyTo?.trim() || replyToAddress();
  // Inutile de mettre en copie le destinataire lui-même.
  const bcc = bccAddresses().filter(
    (a) => a.toLowerCase() !== opts.to.trim().toLowerCase()
  );

  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      ...(opts.html ? { html: opts.html } : {}),
      ...(replyTo ? { replyTo } : {}),
      ...(bcc.length > 0 ? { bcc } : {}),
    });
    if (error) {
      return { ok: false, error: error.message || "Erreur Resend inconnue." };
    }
    return { ok: true, id: data?.id ?? "" };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Erreur d'envoi inconnue.",
    };
  }
}
