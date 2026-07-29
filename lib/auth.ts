// Authentification simple par mot de passe global (utilisateur unique).
// Le cookie de session est signé (HMAC-SHA256) : il ne peut pas être forgé.
//
// ⚠️ La VÉRIFICATION du cookie est dupliquée dans `middleware.ts`, qui doit
// rester autonome (contrainte de l'Edge Runtime Vercel : un middleware ne peut
// pas importer un module partagé avec du code "use server").
// Le format du cookie doit rester identique des deux côtés :
//   valeur = "<expiration_ms>.<hmac_sha256_hex(secret, expiration_ms)>"

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

