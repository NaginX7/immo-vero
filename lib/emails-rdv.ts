// Emails liés aux rendez-vous pris en ligne.
//
// Module simple (pas de "use server") : il est importé aussi bien par les
// actions serveur que par la route planifiée des rappels, sans être exposé
// lui-même comme action appelable depuis le navigateur.

/**
 * Pièces demandées au client avant le rendez-vous.
 *
 * Rappelées deux fois — à la prise de rendez-vous puis 48 h avant — car leur
 * absence fait perdre une visite entière : sans elles, l'estimation ne peut pas
 * être finalisée sur place.
 */
export const PIECES_A_PREPARER = [
  "le titre de propriété",
  "le dernier avis de taxe foncière",
  "les justificatifs des gros travaux de moins de 10 ans, s'il y en a",
];

/** Version texte de la liste (emails en clair). */
export function piecesTexte(): string {
  return PIECES_A_PREPARER.map((p) => `• ${p}`).join("\n");
}

/** Encart HTML listant les pièces à préparer. */
function piecesHtml(): string {
  return `
            <div style="margin:24px 0;padding:16px 18px;background:#fbf3f0;border-radius:8px;border:1px solid #f0cabf;">
              <p style="margin:0 0 10px;font-size:15px;font-weight:bold;color:#16233f;">
                Pour préparer notre rendez-vous
              </p>
              <p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#16233f;">
                Merci de réunir si possible les documents suivants&nbsp;:
              </p>
              <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.8;color:#16233f;">
                ${PIECES_A_PREPARER.map((p) => `<li>${p}</li>`).join(
                  "\n                "
                )}
              </ul>
              <p style="margin:10px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
                Si l'un d'eux vous manque, ce n'est pas bloquant&nbsp;: nous
                ferons le point ensemble sur place.
              </p>
            </div>`;
}

/** Gabarit commun : en-tête à la marque, contenu, pied de page. */
function gabarit(contenu: string): string {
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f7f5f3;font-family:Arial,Helvetica,sans-serif;color:#16233f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f3;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #eee3dd;">
        <tr>
          <td style="background:#16233f;padding:20px 28px;color:#ffffff;">
            <div style="font-size:16px;font-weight:bold;">L'Immobilière de Saverne</div>
            <div style="font-size:13px;color:#a7b6d2;">Véronique Noureddine · Mandataire immobilière</div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
${contenu}
          </td>
        </tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">L'Immobilière de Saverne · Réseau BSK · Saverne (67700)</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function encadreDate(quand: string, adresseBien: string | null): string {
  return `            <p style="margin:0 0 24px;padding:14px 16px;background:#fbf3f0;border-left:3px solid #ee6c4d;border-radius:6px;font-size:15px;font-weight:bold;">
              ${quand}${
                adresseBien
                  ? `<br /><span style="font-weight:normal;font-size:14px;">${adresseBien}</span>`
                  : ""
              }
            </p>`;
}

/** Premier email : demande de confirmation avec les deux boutons (magic link). */
export function buildConfirmationEmail(p: {
  prenom: string;
  quand: string;
  adresseBien: string | null;
  lienConfirme: string;
  lienAnnule: string;
}): string {
  return gabarit(`            <p style="margin:0 0 16px;font-size:15px;">Bonjour ${p.prenom},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
              J'ai bien reçu votre demande de rendez-vous pour&nbsp;:
            </p>
${encadreDate(p.quand, p.adresseBien)}
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
              Merci de me confirmer votre présence&nbsp;:
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
              <tr>
                <td style="padding-right:10px;">
                  <a href="${p.lienConfirme}"
                     style="display:inline-block;padding:13px 26px;background:#ee6c4d;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:bold;">
                    Je confirme
                  </a>
                </td>
                <td>
                  <a href="${p.lienAnnule}"
                     style="display:inline-block;padding:13px 26px;background:#ffffff;color:#16233f;text-decoration:none;border:1px solid #d9d2cc;border-radius:8px;font-size:15px;font-weight:bold;">
                    J'annule
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
              Sans confirmation de votre part, le créneau pourra être proposé à
              une autre personne.
            </p>
${piecesHtml()}
            <p style="margin:24px 0 0;font-size:15px;">
              À très bientôt,<br />
              <strong>Véronique Noureddine</strong><br />
              L'Immobilière de Saverne
            </p>`);
}

/** Rappel envoyé 48 h avant le rendez-vous. */
export function buildRappelEmail(p: {
  prenom: string;
  quand: string;
  adresseBien: string | null;
  lienAnnule: string;
}): string {
  return gabarit(`            <p style="margin:0 0 16px;font-size:15px;">Bonjour ${p.prenom},</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
              Je vous confirme notre rendez-vous dans deux jours&nbsp;:
            </p>
${encadreDate(p.quand, p.adresseBien)}
${piecesHtml()}
            <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
              Un empêchement&nbsp;? Vous pouvez annuler
              <a href="${p.lienAnnule}" style="color:#c33f22;">en cliquant ici</a>,
              ou simplement répondre à cet email.
            </p>
            <p style="margin:24px 0 0;font-size:15px;">
              À très bientôt,<br />
              <strong>Véronique Noureddine</strong><br />
              L'Immobilière de Saverne
            </p>`);
}
