import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_NAME, authMode, signingSecret, verifySessionValue } from "@/lib/auth";

/** Routes accessibles sans authentification (page publique de prise de RDV). */
const PUBLIC_PREFIXES = ["/rdv", "/login"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const mode = authMode();

  // Développement local sans mot de passe : accès direct.
  if (mode === "ouvert") return NextResponse.next();

  // Production sans APP_PASSWORD : on refuse par défaut plutôt que d'exposer
  // les données. La page /login affiche l'explication.
  if (mode === "bloque") {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?config=manquante";
    return NextResponse.redirect(url);
  }

  const ok = await verifySessionValue(
    req.cookies.get(COOKIE_NAME)?.value,
    signingSecret()
  );
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?from=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // On exclut les assets statiques et l'optimiseur d'images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|svg|webp|ico|woff|woff2)$).*)"],
};
