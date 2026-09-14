// Règles communes aux fichiers joints des pièces (client et serveur).

/** Types acceptés : PDF, photos (dont HEIC d'iPhone) et documents Word. */
export const FICHIER_TYPES_ACCEPTES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/** Extensions correspondantes, pour le sélecteur de fichiers du navigateur. */
export const FICHIER_EXTENSIONS_ACCEPTEES =
  ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.doc,.docx";

/** Types affichés directement dans le navigateur ; les autres sont téléchargés. */
export const FICHIER_TYPES_AFFICHABLES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const FICHIER_TAILLE_MAX = 50 * 1024 * 1024; // 50 Mo

/** Dossier du store Blob réservé aux fichiers d'une pièce. */
export function fichierPrefix(documentId: string): string {
  return `documents/${documentId}/`;
}

/** Chemin Blob d'un fichier : nom réduit aux caractères sûrs, extension conservée. */
export function fichierPathname(documentId: string, nom: string): string {
  const propre =
    nom
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "fichier";
  return fichierPrefix(documentId) + propre;
}

export function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
