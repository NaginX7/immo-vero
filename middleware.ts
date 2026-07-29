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

/** Fichiers statiques servis depuis /public (photo, polices…). */
const STATIC_FILE =
  /\.(?:jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|css|js|map|txt|xml)$/i;

function isPublic(pathname: string): boolean {
  if (STATIC_FILE.test(pathname)) return true;
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

function redirectToLogin(req: NextRequest, search: string) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = search;
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  try {
    const password = process.env.APP_PASSWORD ?? "";

    // Aucun mot de passe défini :
    //  - en développement local → accès direct (confort)
    //  - en production → accès BLOQUÉ, on n'expose jamais les données par défaut
    if (password === "") {
      if (process.env.NODE_ENV !== "production") return NextResponse.next();
      return redirectToLogin(req, "?config=manquante");
    }

    const secret = process.env.AUTH_SECRET || password;
    const ok = await verifySession(req.cookies.get(COOKIE_NAME)?.value, secret);
    if (ok) return NextResponse.next();

    return redirectToLogin(
      req,
      pathname === "/" ? "" : `?from=${encodeURIComponent(pathname)}`
    );
  } catch {
    // En cas d'imprévu, on refuse l'accès (fail closed) plutôt que de renvoyer
    // une erreur 500 : le site reste utilisable et les données protégées.
    return redirectToLogin(req, "?erreur=session");
  }
}

export const config = {
  // Motif standard Next.js : on exclut uniquement les internes du framework.
  // Les fichiers statiques sont écartés dans le code (voir STATIC_FILE).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
