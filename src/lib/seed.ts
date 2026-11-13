import type { AppState } from "./types";

export const seedState: AppState = {
  boutiques: [],
  produits: [],
  ventes: [],
  factures: [],
  devis: [],
  clients: [],
  rappels: [],
  paiements: [],
  parametres: {
    entreprise: "Mon entreprise",
    ville: "Douala",
    telephone: "+237 6 00 00 00 00",
    tva: 19.25,
    operateurs: { mtn: true, orange: true },
    rappelAuto: true,
    rappelJours: 7,
  },
  boutiqueActiveId: "all",
  utilisateur: null,
  utilisateurs: [],
};
