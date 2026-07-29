/** @type {import('next').NextConfig} */
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
};

export default nextConfig;
