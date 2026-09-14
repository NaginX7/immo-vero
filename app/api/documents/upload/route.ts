import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { prisma } from "@/lib/prisma";
import { isAuthenticated } from "@/lib/auth-guard";
import {
  FICHIER_TAILLE_MAX,
  FICHIER_TYPES_ACCEPTES,
  fichierPrefix,
} from "@/lib/document-fichiers";

export const dynamic = "force-dynamic";

/**
 * Délivre au navigateur un jeton d'envoi vers le store Blob privé.
 *
 * Le fichier part directement du navigateur vers Vercel Blob : passer par une
 * fonction serverless limiterait l'envoi à 4,5 Mo, ce que dépasse souvent un
 * dossier de diagnostics. L'enregistrement en base se fait ensuite par
 * l'action `attachFichier`, une fois l'envoi terminé.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!(await isAuthenticated())) throw new Error("Non autorisé.");

        const documentId = clientPayload ?? "";
        if (!documentId || !pathname.startsWith(fichierPrefix(documentId))) {
          throw new Error("Chemin de fichier invalide.");
        }
        const doc = await prisma.document.findUnique({
          where: { id: documentId },
          select: { id: true },
        });
        if (!doc) throw new Error("Pièce introuvable.");

        return {
          allowedContentTypes: FICHIER_TYPES_ACCEPTES,
          maximumSizeInBytes: FICHIER_TAILLE_MAX,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Envoi impossible." },
      { status: 400 }
    );
  }
}
