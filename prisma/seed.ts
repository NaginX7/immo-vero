import { PrismaClient, type DocType, type DocStatus } from "@prisma/client";
import {
  BIEN_DOC_CHECKLIST,
  COPRO_DOC_CHECKLIST,
  DOC_TYPE_LABELS,
} from "../lib/labels";

const prisma = new PrismaClient();

// --- Helpers de dates -----------------------------------------------------
const now = new Date();
function days(delta: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + delta);
  d.setHours(10, 0, 0, 0);
  return d;
}
function at(delta: number, hour: number, min = 0): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + delta);
  d.setHours(hour, min, 0, 0);
  return d;
}

/** Construit la checklist documentaire d'un bien avec statuts personnalisés. */
function docChecklist(
  overrides: Partial<Record<DocType, DocStatus>> = {},
  copro = false
) {
  const types = copro
    ? [...BIEN_DOC_CHECKLIST, ...COPRO_DOC_CHECKLIST]
    : BIEN_DOC_CHECKLIST;
  return types.map((type) => {
    const statut: DocStatus = overrides[type] ?? "MANQUANT";
    return {
      type,
      libelle: DOC_TYPE_LABELS[type],
      statut,
      dateRecu: statut === "RECU" ? days(-Math.floor(Math.random() * 20) - 1) : null,
    };
  });
}

async function main() {
  console.log("🌱 Nettoyage de la base…");
  await prisma.booking.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.slotClosure.deleteMany();
  await prisma.echange.deleteMany();
  await prisma.document.deleteMany();
  await prisma.evenement.deleteMany();
  await prisma.pieceSurface.deleteMany();
  await prisma.recherche.deleteMany();
  await prisma.bien.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.partenaire.deleteMany();
  await prisma.template.deleteMany();

  // --- Partenaires --------------------------------------------------------
  console.log("🤝 Partenaires…");
  const [diag, notaire, courtier] = await Promise.all([
    prisma.partenaire.create({
      data: {
        nom: "Marc Ziegler",
        societe: "Alsace Diag",
        type: "DIAGNOSTIQUEUR",
        specialite: "DPE, amiante, plomb, électricité",
        telephone: "06 12 34 56 78",
        email: "contact@alsace-diag.fr",
        adresse: "12 rue de la Gare, 67700 Saverne",
        nbAffaires: 14,
        notes: "Réactif, délai moyen 5 jours. Tarif préférentiel réseau.",
      },
    }),
    prisma.partenaire.create({
      data: {
        nom: "Me Hoffmann",
        societe: "Étude notariale Hoffmann & Associés",
        type: "NOTAIRE",
        specialite: "Ventes, successions",
        telephone: "03 88 91 10 20",
        email: "office.hoffmann@notaires.fr",
        adresse: "3 place du Général de Gaulle, 67700 Saverne",
        nbAffaires: 9,
      },
    }),
    prisma.partenaire.create({
      data: {
        nom: "Julie Kremer",
        societe: "Cafpi Saverne",
        type: "COURTIER",
        specialite: "Financement primo-accédants",
        telephone: "07 88 22 44 66",
        email: "j.kremer@cafpi.fr",
        nbAffaires: 6,
        notes: "Bon taux d'acceptation. Prévenir 48h à l'avance.",
      },
    }),
  ]);

  // --- Contacts -----------------------------------------------------------
  console.log("👤 Contacts…");
  const bernard = await prisma.contact.create({
    data: {
      civilite: "M.",
      nom: "Muller",
      prenom: "Bernard",
      roles: ["VENDEUR"],
      telephone: "06 45 78 12 33",
      email: "b.muller@orange.fr",
      adresse: "8 rue des Roses",
      codePostal: "67700",
      ville: "Saverne",
      profession: "Retraité (ancien enseignant)",
      situationFamiliale: "Marié",
    },
  });
  const christine = await prisma.contact.create({
    data: {
      civilite: "Mme",
      nom: "Muller",
      prenom: "Christine",
      roles: ["VENDEUR"],
      telephone: "06 45 78 12 34",
      email: "c.muller@orange.fr",
      adresse: "8 rue des Roses",
      codePostal: "67700",
      ville: "Saverne",
      profession: "Retraitée",
      situationFamiliale: "Mariée",
    },
  });
  const sophie = await prisma.contact.create({
    data: {
      civilite: "Mme",
      nom: "Klein",
      prenom: "Sophie",
      roles: ["VENDEUR"],
      telephone: "06 22 11 88 90",
      email: "sophie.klein@gmail.com",
      ville: "Strasbourg",
      profession: "Infirmière",
      situationFamiliale: "Célibataire",
      notes: "Vente dans le cadre de la succession de sa mère.",
    },
  });
  const weber = await prisma.contact.create({
    data: {
      civilite: "M.",
      nom: "Weber",
      prenom: "Jean-Pierre",
      roles: ["VENDEUR"],
      telephone: "06 77 65 43 21",
      email: "jp.weber@free.fr",
      ville: "Saverne",
      profession: "Artisan menuisier",
      situationFamiliale: "En instance de divorce",
    },
  });
  const nadia = await prisma.contact.create({
    data: {
      civilite: "Mme",
      nom: "Lefebvre",
      prenom: "Nadia",
      roles: ["VENDEUR", "ACQUEREUR"],
      telephone: "06 10 20 30 40",
      email: "nadia.lefebvre@gmail.com",
      ville: "Monswiller",
      profession: "Cadre bancaire",
      situationFamiliale: "Mariée, 2 enfants",
      notes: "Vend son appartement pour acheter une maison plus grande.",
    },
  });

  const fatima = await prisma.contact.create({
    data: {
      civilite: "Mme",
      nom: "Benali",
      prenom: "Fatima",
      roles: ["ACQUEREUR"],
      telephone: "06 98 76 54 32",
      email: "f.benali@gmail.com",
      ville: "Saverne",
      profession: "Pharmacienne",
      situationFamiliale: "Mariée, 1 enfant",
    },
  });
  const thomas = await prisma.contact.create({
    data: {
      civilite: "M.",
      nom: "Schmitt",
      prenom: "Thomas",
      roles: ["ACQUEREUR"],
      telephone: "07 12 45 78 96",
      email: "thomas.schmitt@gmail.com",
      ville: "Saverne",
      profession: "Ingénieur",
      situationFamiliale: "En couple",
    },
  });
  const lea = await prisma.contact.create({
    data: {
      civilite: "Mme",
      nom: "Fischer",
      prenom: "Léa",
      roles: ["ACQUEREUR"],
      telephone: "06 55 44 33 22",
      email: "lea.fischer@outlook.fr",
      ville: "Steinbourg",
      profession: "Professeure des écoles",
      situationFamiliale: "Célibataire",
    },
  });
  const apporteur = await prisma.contact.create({
    data: {
      civilite: "M.",
      nom: "Dubois",
      prenom: "Marc",
      roles: ["APPORTEUR"],
      telephone: "06 33 66 99 00",
      email: "marc.dubois@gmail.com",
      ville: "Saverne",
      profession: "Agent d'assurance",
      notes: "Apporteur régulier — réseau local. Tutoiement.",
    },
  });

  // --- Recherches acquéreurs ---------------------------------------------
  console.log("🔎 Recherches acquéreurs…");
  await prisma.recherche.createMany({
    data: [
      {
        contactId: fatima.id,
        titre: "Maison familiale Saverne",
        typeBien: "Maison",
        secteur: "Saverne, Monswiller, Otterswiller",
        budgetMin: 250000,
        budgetMax: 320000,
        surfaceMin: 110,
        nbChambresMin: 3,
        notes: "Jardin indispensable, garage souhaité.",
      },
      {
        contactId: thomas.id,
        titre: "Appartement centre",
        typeBien: "Appartement",
        secteur: "Saverne centre",
        budgetMin: 150000,
        budgetMax: 200000,
        surfaceMin: 60,
        nbChambresMin: 2,
      },
      {
        contactId: lea.id,
        titre: "Premier achat",
        typeBien: "Maison de village",
        secteur: "Steinbourg, Dettwiller",
        budgetMax: 210000,
        nbChambresMin: 2,
        notes: "Primo-accédante, financement à valider avec courtier.",
      },
      {
        contactId: nadia.id,
        titre: "Maison plus grande",
        typeBien: "Maison",
        secteur: "Monswiller, Saverne",
        budgetMin: 300000,
        budgetMax: 380000,
        surfaceMin: 130,
        nbChambresMin: 4,
      },
    ],
  });

  // --- Biens --------------------------------------------------------------
  console.log("🏠 Biens…");
  const pieces = (
    list: [string, number][]
  ): { nom: string; surface: number; ordre: number }[] =>
    list.map(([nom, surface], i) => ({ nom, surface, ordre: i }));

  // 1) Maison Muller — Commercialisation
  const maisonMuller = await prisma.bien.create({
    data: {
      reference: "SAV-2026-007",
      titre: "Maison 6 pièces — rue des Roses",
      stage: "COMMERCIALISATION",
      position: 0,
      dateDecouverte: days(-52),
      datePropriete: new Date("1998-06-15"),
      adresse: "8 rue des Roses",
      codePostal: "67700",
      ville: "Saverne",
      prixEstime: 335000,
      prixMandat: 329000,
      plans: true,
      travauxMoins10Ans: true,
      surface: 142,
      surfaceTerrain: 620,
      mitoyennete: "Aucune",
      plainPied: false,
      nbPieces: 6,
      nbChambres: 4,
      typeConstruction: "Traditionnel (parpaing)",
      typeCouverture: "Tuiles",
      typeCharpente: "Fermette bois",
      modeChauffage: "Gaz de ville (chaudière condensation 2019)",
      modeEauChaude: "Chaudière gaz",
      typeFenetres: "PVC double vitrage",
      raisonEstimation: "MUTATION",
      raisonEstimationNote: "Départ en retraite dans le sud.",
      professionProprietaire: "Retraités",
      copropriete: false,
      notes: "Bien entretenu. Cuisine équipée récente. Bon potentiel familial.",
      proprietaires: { connect: [{ id: bernard.id }, { id: christine.id }] },
      pieces: {
        create: pieces([
          ["Salon-séjour", 32],
          ["Cuisine", 14],
          ["Chambre 1", 15],
          ["Chambre 2", 12],
          ["Chambre 3", 11],
          ["Chambre 4 / bureau", 10],
          ["Salle de bain", 7],
          ["Garage", 18],
        ]),
      },
      documents: {
        create: docChecklist({
          PEC_VENDEUR: "RECU",
          TITRE_PROPRIETE: "RECU",
          TAXE_FONCIERE: "RECU",
          DIAG_IMMO: "RECU",
          SDEA: "RECU",
          FACTURES_TRAVAUX: "RECU",
          MODE_FINANCEMENT: "NON_APPLICABLE",
        }),
      },
    },
  });

  // 2) Appartement Klein — R2 Estimation (copropriété)
  const appartKlein = await prisma.bien.create({
    data: {
      reference: "SAV-2026-011",
      titre: "Appartement 3 pièces — succession",
      stage: "R2_ESTIMATION",
      position: 0,
      dateDecouverte: days(-14),
      adresse: "24 Grand'Rue",
      codePostal: "67700",
      ville: "Saverne",
      prixEstime: 178000,
      plans: false,
      travauxMoins10Ans: false,
      surface: 68,
      mitoyennete: "Immeuble",
      plainPied: false,
      nbPieces: 3,
      nbChambres: 2,
      typeConstruction: "Immeuble ancien (1930)",
      typeCouverture: "Tuiles",
      modeChauffage: "Électrique",
      modeEauChaude: "Ballon électrique",
      typeFenetres: "Bois simple vitrage (à prévoir)",
      raisonEstimation: "SUCCESSION",
      raisonEstimationNote: "Succession de la mère de Mme Klein.",
      professionProprietaire: "Infirmière",
      copropriete: true,
      notes:
        "Copropriété de 8 lots. Ravalement voté en AG. Rafraîchissement à prévoir.",
      proprietaires: { connect: [{ id: sophie.id }] },
      pieces: {
        create: pieces([
          ["Séjour", 24],
          ["Cuisine", 9],
          ["Chambre 1", 13],
          ["Chambre 2", 11],
          ["Salle d'eau", 5],
        ]),
      },
      documents: {
        create: docChecklist(
          {
            TITRE_PROPRIETE: "RECU",
            TAXE_FONCIERE: "RECU",
            DIAG_IMMO: "MANQUANT",
            PV_AG: "RECU",
            REGLEMENT_COPRO: "RECU",
            APPELS_FONDS: "MANQUANT",
            DIAGS_COPRO: "MANQUANT",
          },
          true
        ),
      },
    },
  });

  // 3) Maison Weber — Mandat signé (divorce)
  const maisonWeber = await prisma.bien.create({
    data: {
      reference: "SAV-2026-009",
      titre: "Maison de ville — divorce",
      stage: "MANDAT_SIGNE",
      position: 0,
      dateDecouverte: days(-30),
      adresse: "15 rue du Tribunal",
      codePostal: "67700",
      ville: "Saverne",
      prixEstime: 245000,
      prixMandat: 245000,
      plans: true,
      travauxMoins10Ans: false,
      surface: 105,
      surfaceTerrain: 210,
      mitoyennete: "2 côtés",
      nbPieces: 5,
      nbChambres: 3,
      typeConstruction: "Ancien rénové",
      modeChauffage: "Fioul",
      modeEauChaude: "Chaudière fioul",
      typeFenetres: "PVC double vitrage",
      raisonEstimation: "DIVORCE",
      professionProprietaire: "Artisan menuisier",
      copropriete: false,
      notes: "Vente liée au divorce — dossier à traiter avec tact et rapidité.",
      proprietaires: { connect: [{ id: weber.id }] },
      pieces: {
        create: pieces([
          ["Séjour", 28],
          ["Cuisine", 11],
          ["Chambre 1", 14],
          ["Chambre 2", 12],
          ["Chambre 3", 10],
          ["Salle de bain", 6],
        ]),
      },
      documents: {
        create: docChecklist({
          TITRE_PROPRIETE: "RECU",
          TAXE_FONCIERE: "RECU",
          PEC_VENDEUR: "RECU",
          DIAG_IMMO: "MANQUANT",
          SDEA: "MANQUANT",
        }),
      },
    },
  });

  // 4) Appartement Lefebvre — Prospection
  const appartLefebvre = await prisma.bien.create({
    data: {
      reference: "SAV-2026-014",
      titre: "Appartement 4 pièces — Monswiller",
      stage: "PROSPECTION",
      position: 0,
      dateDecouverte: days(-3),
      adresse: "5 rue des Vergers",
      codePostal: "67700",
      ville: "Monswiller",
      prixEstime: 215000,
      surface: 88,
      nbPieces: 4,
      nbChambres: 3,
      copropriete: true,
      raisonEstimation: "VENTE",
      raisonEstimationNote: "Souhaite acheter plus grand (voir sa recherche).",
      professionProprietaire: "Cadre bancaire",
      notes: "Premier contact pris. RDV découverte à caler.",
      proprietaires: { connect: [{ id: nadia.id }] },
      documents: { create: docChecklist({}, true) },
    },
  });

  // 5) Villa — Offre en cours
  const villa = await prisma.bien.create({
    data: {
      reference: "SAV-2026-004",
      titre: "Villa contemporaine — Otterswiller",
      stage: "OFFRE_EN_COURS",
      position: 0,
      dateDecouverte: days(-70),
      adresse: "2 impasse des Cerisiers",
      codePostal: "67700",
      ville: "Otterswiller",
      prixEstime: 420000,
      prixMandat: 415000,
      plans: true,
      travauxMoins10Ans: true,
      surface: 165,
      surfaceTerrain: 850,
      mitoyennete: "Aucune",
      plainPied: true,
      nbPieces: 6,
      nbChambres: 4,
      typeConstruction: "Contemporain (2016)",
      typeCouverture: "Tuiles",
      typeCharpente: "Industrielle",
      modeChauffage: "Pompe à chaleur",
      modeEauChaude: "Ballon thermodynamique",
      typeFenetres: "Alu double vitrage",
      raisonEstimation: "MUTATION",
      professionProprietaire: "Chef d'entreprise",
      copropriete: false,
      notes: "Offre de Fatima Benali à 405 000 € en cours de négociation.",
      documents: {
        create: docChecklist({
          PEC_VENDEUR: "RECU",
          TITRE_PROPRIETE: "RECU",
          TAXE_FONCIERE: "RECU",
          DIAG_IMMO: "RECU",
          SDEA: "RECU",
          FACTURES_TRAVAUX: "RECU",
        }),
      },
    },
  });

  // 6) Appartement — Compromis
  const appartCompromis = await prisma.bien.create({
    data: {
      reference: "SAV-2025-052",
      titre: "Appartement 2 pièces — centre",
      stage: "COMPROMIS",
      position: 0,
      dateDecouverte: days(-95),
      adresse: "10 rue de la Côte",
      codePostal: "67700",
      ville: "Saverne",
      prixEstime: 165000,
      prixMandat: 162000,
      surface: 54,
      nbPieces: 2,
      nbChambres: 1,
      copropriete: true,
      raisonEstimation: "INVESTISSEMENT",
      professionProprietaire: "Investisseur",
      notes: "Compromis signé avec Thomas Schmitt. Notaire : Me Hoffmann.",
      documents: {
        create: docChecklist(
          {
            PEC_VENDEUR: "RECU",
            TITRE_PROPRIETE: "RECU",
            TAXE_FONCIERE: "RECU",
            DIAG_IMMO: "RECU",
            PV_AG: "RECU",
            REGLEMENT_COPRO: "RECU",
            APPELS_FONDS: "RECU",
            DIAGS_COPRO: "RECU",
            MODE_FINANCEMENT: "RECU",
          },
          true
        ),
      },
    },
  });

  // 7) Maison — Vente définitive
  const maisonVendue = await prisma.bien.create({
    data: {
      reference: "SAV-2025-041",
      titre: "Maison 4 pièces — Steinbourg",
      stage: "VENTE_DEFINITIVE",
      position: 0,
      dateDecouverte: days(-160),
      adresse: "7 rue Principale",
      codePostal: "67790",
      ville: "Steinbourg",
      prixMandat: 232000,
      surface: 98,
      nbPieces: 4,
      nbChambres: 3,
      copropriete: false,
      raisonEstimation: "SUCCESSION",
      notes: "Vendue à Léa Fischer. Acte signé.",
      documents: {
        create: docChecklist({
          PEC_VENDEUR: "RECU",
          TITRE_PROPRIETE: "RECU",
          TAXE_FONCIERE: "RECU",
          DIAG_IMMO: "RECU",
          SDEA: "RECU",
          MODE_FINANCEMENT: "RECU",
        }),
      },
    },
  });

  // --- Événements ---------------------------------------------------------
  console.log("📅 Événements…");
  await prisma.evenement.createMany({
    data: [
      // À venir (dashboard)
      {
        type: "VISITE",
        titre: "Visite maison Muller",
        date: at(1, 14, 30),
        description: "Visite avec M. et Mme Schmitt.",
        bienId: maisonMuller.id,
        contactId: thomas.id,
      },
      {
        type: "RDV",
        titre: "R1 Découverte — appartement Lefebvre",
        date: at(2, 10, 0),
        description: "Premier rendez-vous découverte à Monswiller.",
        bienId: appartLefebvre.id,
        contactId: nadia.id,
      },
      {
        type: "ESTIMATION",
        titre: "R2 Estimation — appartement Klein",
        date: at(3, 16, 0),
        bienId: appartKlein.id,
        contactId: sophie.id,
      },
      {
        type: "VISITE",
        titre: "Contre-visite villa Otterswiller",
        date: at(4, 11, 0),
        bienId: villa.id,
        contactId: fatima.id,
      },
      {
        type: "SIGNATURE",
        titre: "Signature acte — appartement centre",
        date: at(9, 15, 0),
        description: "Signature définitive chez Me Hoffmann.",
        bienId: appartCompromis.id,
        contactId: thomas.id,
      },
      // Bloc « Affaires & recommandations » des partenaires
      {
        type: "APPORT_AFFAIRE",
        titre: "Apport : vendeurs villa Otterswiller",
        date: days(-40),
        description: "Contact vendeur transmis par la courtière.",
        partenaireId: courtier.id,
      },
      {
        type: "RECOMMANDATION",
        titre: "Recommandation acquéreur solvable",
        date: days(-9),
        description: "Dossier de financement solide, orienté vers nous.",
        partenaireId: courtier.id,
      },
      // Passés
      {
        type: "MANDAT",
        titre: "Signature mandat exclusif — maison Weber",
        date: days(-12),
        bienId: maisonWeber.id,
        contactId: weber.id,
      },
      {
        type: "OFFRE",
        titre: "Offre d'achat 405 000 € — villa",
        date: days(-4),
        description: "Offre de Mme Benali, sous réserve de financement.",
        bienId: villa.id,
        contactId: fatima.id,
      },
      {
        type: "COMPROMIS",
        titre: "Compromis signé — appartement centre",
        date: days(-8),
        bienId: appartCompromis.id,
        contactId: thomas.id,
      },
    ],
  });

  // --- Échanges -----------------------------------------------------------
  console.log("✉️ Échanges…");
  await prisma.echange.createMany({
    data: [
      {
        type: "APPEL",
        date: days(-2),
        direction: "sortant",
        contenu:
          "Appel à M. Muller pour confirmer la visite de mercredi. OK de son côté.",
        contactId: bernard.id,
        bienId: maisonMuller.id,
      },
      {
        type: "EMAIL",
        date: days(-5),
        direction: "sortant",
        contenu:
          "Envoi du compte-rendu de visite à Mme Benali suite à la visite de la villa.",
        contactId: fatima.id,
        bienId: villa.id,
      },
      {
        type: "SMS",
        date: days(-1),
        direction: "sortant",
        contenu: "Rappel RDV découverte demain 10h à Monswiller.",
        contactId: nadia.id,
        bienId: appartLefebvre.id,
      },
      {
        type: "NOTE",
        date: days(-3),
        contenu:
          "Mme Klein souhaite vendre rapidement mais reste attachée au bien (souvenir familial). Rester patiente sur le prix.",
        contactId: sophie.id,
        bienId: appartKlein.id,
      },
      {
        type: "APPEL",
        date: days(-6),
        direction: "entrant",
        contenu:
          "Marc Dubois signale un vendeur potentiel sur Otterswiller. À rappeler.",
        contactId: apporteur.id,
      },
    ],
  });

  // --- Documents contact (TRACFIN) ---------------------------------------
  console.log("🪪 Pièces contacts (TRACFIN)…");
  await prisma.document.createMany({
    data: [
      {
        type: "PIECE_IDENTITE",
        libelle: DOC_TYPE_LABELS.PIECE_IDENTITE,
        statut: "RECU",
        dateRecu: days(-40),
        contactId: bernard.id,
      },
      {
        type: "PIECE_IDENTITE",
        libelle: DOC_TYPE_LABELS.PIECE_IDENTITE,
        statut: "RECU",
        dateRecu: days(-40),
        contactId: christine.id,
      },
      {
        type: "PIECE_IDENTITE",
        libelle: DOC_TYPE_LABELS.PIECE_IDENTITE,
        statut: "MANQUANT",
        contactId: sophie.id,
      },
      {
        type: "ORIGINE_FONDS",
        libelle: DOC_TYPE_LABELS.ORIGINE_FONDS,
        statut: "MANQUANT",
        contactId: fatima.id,
      },
      {
        type: "PIECE_IDENTITE",
        libelle: DOC_TYPE_LABELS.PIECE_IDENTITE,
        statut: "RECU",
        dateRecu: days(-20),
        contactId: thomas.id,
      },
    ],
  });

  // --- Templates ----------------------------------------------------------
  console.log("📝 Templates…");
  const SIGN_SMS = "Véronique Noureddine — L'Immobilière";
  const SIGN_MAIL = "Véronique Noureddine / L'Immobilière de Saverne";
  await prisma.template.createMany({
    data: [
      {
        nom: "Relance vendeur — sans nouvelle",
        categorie: "RELANCE_VENDEUR",
        canal: "SMS",
        corps:
          "Bonjour {prénom}, je reviens vers vous concernant votre bien {adresse_bien}. Êtes-vous toujours dans une démarche de vente ? Je reste à votre disposition. " +
          SIGN_SMS,
      },
      {
        nom: "Relance vendeur — point commercialisation",
        categorie: "RELANCE_VENDEUR",
        canal: "EMAIL",
        objet: "Point sur la commercialisation de votre bien",
        corps:
          "Bonjour {prénom},\n\nJe me permets de faire un point avec vous sur la commercialisation de votre bien situé {adresse_bien}. Nous avons eu {nb_visites} visite(s) et je souhaiterais échanger sur les premiers retours.\n\nSeriez-vous disponible pour un appel cette semaine ?\n\nBien à vous,\n" +
          SIGN_MAIL,
      },
      {
        nom: "Relance acquéreur — nouveau bien",
        categorie: "RELANCE_ACQUEREUR",
        canal: "SMS",
        corps:
          "Bonjour {prénom}, un bien correspondant à votre recherche vient de rentrer : {adresse_bien}, {prix}. Souhaitez-vous le visiter ? " +
          SIGN_SMS,
      },
      {
        nom: "Compte-rendu post-visite",
        categorie: "CR_POST_VISITE",
        canal: "EMAIL",
        objet: "Suite à votre visite du {date_rdv}",
        corps:
          "Bonjour {prénom},\n\nJe vous remercie pour votre visite du bien {adresse_bien} le {date_rdv}. N'hésitez pas à me faire part de vos impressions et de vos éventuelles questions.\n\nJe reste disponible pour une seconde visite si vous le souhaitez.\n\nBien à vous,\n" +
          SIGN_MAIL,
      },
      {
        nom: "Rappel RDV — veille",
        categorie: "RAPPEL_RDV_VEILLE",
        canal: "SMS",
        corps:
          "Bonjour {prénom}, petit rappel de notre rendez-vous demain {date_rdv} à {adresse_bien}. À demain ! " +
          SIGN_SMS,
      },
      {
        nom: "Réseau apporteurs — remerciement",
        categorie: "RESEAU_APPORTEURS",
        canal: "SMS",
        tutoiement: true,
        corps:
          "Salut {prénom}, merci pour ton tuyau sur {adresse_bien} ! Je te tiens au courant de la suite. À bientôt. " +
          SIGN_SMS,
      },
      {
        nom: "Réseau apporteurs — sollicitation",
        categorie: "RESEAU_APPORTEURS",
        canal: "EMAIL",
        tutoiement: true,
        objet: "Un bien à vendre autour de toi ?",
        corps:
          "Salut {prénom},\n\nJ'espère que tu vas bien. Je suis en recherche active de biens sur le secteur de Saverne. Si tu entends parler d'un projet de vente autour de toi, pense à moi — commission d'apport à la clé !\n\nMerci d'avance,\n" +
          SIGN_MAIL,
      },
    ],
  });

  // --- Calendrier ---------------------------------------------------------
  console.log("📆 Calendrier (disponibilités par défaut)…");
  await prisma.calendarSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      titrePublic:
        "Calendrier de Véronique Noureddine,\nvotre partenaire immobilier en Alsace",
      messagePublic:
        "Choisissez le créneau qui vous convient, je vous confirme le rendez-vous par email.",
    },
    update: {},
  });
  await prisma.availabilityRule.createMany({
    data: [
      // Lundi → vendredi, matin et après-midi
      ...[1, 2, 3, 4, 5].flatMap((jour) => [
        { jourSemaine: jour, heureDebut: "09:00", heureFin: "12:00" },
        { jourSemaine: jour, heureDebut: "14:00", heureFin: "18:00" },
      ]),
      // Samedi matin
      { jourSemaine: 6, heureDebut: "09:00", heureFin: "12:00" },
    ],
  });

  console.log("✅ Seed terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
