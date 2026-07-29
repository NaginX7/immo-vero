import { Resend } from "resend";

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const DEFAULT_FROM = "L'Immobilière de Saverne <onboarding@resend.dev>";

/** Envoie un email via Resend. Ne jette jamais : renvoie un résultat typé. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
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

  try {
    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      ...(opts.html ? { html: opts.html } : {}),
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
