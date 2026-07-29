// Authentification simple par mot de passe global (utilisateur unique).
// Le cookie de session est signé (HMAC-SHA256) : il ne peut pas être forgé.
// Utilise l'API Web Crypto → compatible middleware Edge ET runtime Node.

export const COOKIE_NAME = "giorgio_session";
export const SESSION_DAYS = 30;

const encoder = new TextEncoder();

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Secret de signature : AUTH_SECRET si défini, sinon dérivé du mot de passe. */
export function signingSecret(): string {
  return process.env.AUTH_SECRET || process.env.APP_PASSWORD || "";
}

/** Valeur de cookie signée, valable SESSION_DAYS jours. */
export async function createSessionValue(secret: string): Promise<string> {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  return `${exp}.${await hmacHex(secret, String(exp))}`;
}

/** Vérifie signature + expiration (comparaison à temps constant). */
export async function verifySessionValue(
  value: string | undefined,
  secret: string
): Promise<boolean> {
  if (!value || !secret) return false;
  const sep = value.indexOf(".");
  if (sep <= 0) return false;

  const expStr = value.slice(0, sep);
  const sig = value.slice(sep + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  const expected = await hmacHex(secret, expStr);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * État de la configuration d'authentification.
 * - "ouvert"   : pas de mot de passe défini (développement local uniquement)
 * - "protege"  : mot de passe défini
 * - "bloque"   : production sans mot de passe → on refuse tout par sécurité
 */
export function authMode(): "ouvert" | "protege" | "bloque" {
  const password = process.env.APP_PASSWORD;
  if (password && password.length > 0) return "protege";
  return process.env.NODE_ENV === "production" ? "bloque" : "ouvert";
}
