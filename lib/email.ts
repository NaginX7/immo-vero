import { Resend } from "resend";

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const DEFAULT_FROM = "L'Immobilière de Saverne <onboarding@resend.dev>";

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
  const v = process.env.RESEND_REPLY_TO?.trim();
  return v && v !== "" ? v : undefined;
}

/** Envoie un email via Resend. Ne jette jamais : renvoie un résultat typé. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      ok: false,
      error:
        "Clé API Resend absente. Renseignez RESEND_API_KEY dans le fichier .env.",
    };
  }

  const from = process.env.RESEND_FROM || DEFAULT_FROM;
  const replyTo = opts.replyTo?.trim() || replyToAddress();

  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      ...(opts.html ? { html: opts.html } : {}),
      ...(replyTo ? { replyTo } : {}),
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
