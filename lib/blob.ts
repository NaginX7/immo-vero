import { del } from "@vercel/blob";

/** Supprime des fichiers du store Blob sans bloquer l'action en cas d'échec. */
export async function supprimerBlobs(urls: string[]) {
  if (urls.length === 0) return;
  try {
    await del(urls);
  } catch (e) {
    console.error("Suppression Blob impossible", e);
  }
}
