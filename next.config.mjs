/** @type {import('next').NextConfig} */

/** Hôte d'une URL d'environnement (ex. "https://site.fr/" → "site.fr"). */
function hostOf(url) {
  try {
    return url ? new URL(url.trim()).host : null;
  } catch {
    return null;
  }
}

// Deux domaines servent le même déploiement :
//  - PUBLIC_URL (veronique-immobilier-saverne.fr) : uniquement la prise de
//    rendez-vous publique (/rdv et /rdv/confirmation) ;
//  - APP_URL (admin.veronique-immobilier-saverne.fr) : l'espace de gestion.
// Sans PUBLIC_URL (poste local), aucune redirection n'est appliquée.
const publicUrl = process.env.PUBLIC_URL?.trim().replace(/\/+$/, "");
const publicHost = hostOf(publicUrl);
const adminUrl = process.env.APP_URL?.trim().replace(/\/+$/, "");
const adminHost = hostOf(adminUrl);

const nextConfig = {
  async headers() {
    return [
      {
        // Outil de gestion interne : on interdit l'indexation au niveau HTTP,
        // en complément du robots.txt et de la balise meta. Cet en-tête couvre
        // aussi les réponses non-HTML (images, JSON…) et s'applique quel que
        // soit le domaine servi, y compris les URL *.vercel.app.
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, noimageindex",
          },
        ],
      },
    ];
  },

  async redirects() {
    if (!publicHost || !adminHost || publicHost === adminHost) return [];

    return [
      // Domaine public : l'accueil mène à la prise de rendez-vous…
      {
        source: "/",
        has: [{ type: "host", value: publicHost }],
        destination: "/rdv",
        permanent: false,
      },
      // … et tout ce qui n'est pas la prise de rendez-vous (ou ses fichiers
      // techniques) part vers l'espace de gestion.
      {
        source:
          "/:path((?!rdv(?:/|$)|_next/|icon\\.svg$|robots\\.txt$).*)",
        has: [{ type: "host", value: publicHost }],
        destination: `${adminUrl}/:path`,
        permanent: false,
      },
      // Domaine admin : les anciens liens de rendez-vous (y compris ceux des
      // emails déjà envoyés) basculent vers le domaine public.
      {
        source: "/rdv/:path*",
        has: [{ type: "host", value: adminHost }],
        destination: `${publicUrl}/rdv/:path*`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
