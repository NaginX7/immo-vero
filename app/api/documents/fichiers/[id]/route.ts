import { NextResponse } from "next/server";
import { get } from "@vercel/blob";

import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-guard";
import { FICHIER_TYPES_AFFICHABLES } from "@/lib/document-fichiers";

export const dynamic = "force-dynamic";

/**
 * Sert un fichier joint. Le store Blob est privé : les fichiers ne sont
 * lisibles qu'à travers cette route, après vérification de la session.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAuthenticated())) {
    return new NextResponse("Non autorisé.", { status: 401 });
  }

  const fichier = await prisma.documentFichier.findUnique({
    where: { id: params.id },
  });
  if (!fichier) return new NextResponse("Fichier introuvable.", { status: 404 });

  const blob = await get(fichier.pathname, { access: "private", useCache: false });
  if (!blob || blob.statusCode !== 200) {
    return new NextResponse("Fichier introuvable.", { status: 404 });
  }

  const contentType = fichier.contentType ?? blob.blob.contentType;
  // Seuls les PDF et les images s'ouvrent dans le navigateur ; le reste est
  // téléchargé, pour ne jamais interpréter un contenu actif sur ce domaine.
  const disposition = FICHIER_TYPES_AFFICHABLES.includes(contentType)
    ? "inline"
    : "attachment";

  return new NextResponse(blob.stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(blob.blob.size),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(fichier.nom)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
