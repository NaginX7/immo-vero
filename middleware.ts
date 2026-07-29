import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware d'accès (Edge Runtime).
 *
 * ⚠️ Ce fichier est volontairement AUTONOME : aucun import de module local.
 * L'Edge Runtime de Vercel refuse de déployer un middleware qui référence des
 * modules partagés avec du code serveur ("use server"). La logique de session
 * est donc dupliquée ici, en miroir de `lib/auth.ts`.
 *
 * Le format du cookie doit rester identique des deux côtés :
 *   valeur = "<expiration_ms>.<hmac_sha256_hex(secret, expiration_ms)>"
 * Toute modification ici doit être reportée dans `lib/auth.ts` (et inversement).
 */

const COOKIE_NAME = "giorgio_session";

/** Routes accessibles sans authentification (prise de RDV publique + login). */
const PUBLIC_PREFIXES = ["/rdv", "/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Vérifie la signature et la date d'expiration du cookie de session. */
async function verifySession(
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const password = process.env.APP_PASSWORD ?? "";

  // Aucun mot de passe défini :
  //  - en développement local → accès direct (confort)
  //  - en production → accès BLOQUÉ, on n'expose jamais les données par défaut
  if (password === "") {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?config=manquante";
    return NextResponse.redirect(url);
  }

  const secret = process.env.AUTH_SECRET || password;
  const ok = await verifySession(req.cookies.get(COOKIE_NAME)?.value, secret);
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?from=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Assets statiques et optimiseur d'images exclus.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|svg|webp|ico|woff|woff2)$).*)",
  ],
};
