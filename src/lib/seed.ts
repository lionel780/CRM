import type {
  AppState,
  Boutique,
  Client,
  Devis,
  Facture,
  LigneDocument,
  ModePaiement,
  Operateur,
  Paiement,
  Produit,
  Vente,
} from "./types";

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261110);
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];

const boutiques: Boutique[] = [
  {
    id: "bq-akwa",
    nom: "Boutique Akwa",
    ville: "Douala",
    adresse: "Rue Njo-Njo, Akwa",
    telephone: "+237 6 55 41 20 18",
    actif: true,
  },
  {
    id: "bq-bonaberi",
    nom: "Dépôt Bonabéri",
    ville: "Douala",
    adresse: "Route de Bonabéri, face marché",
    telephone: "+237 6 78 09 33 42",
    actif: true,
  },
  {
    id: "bq-makepe",
    nom: "Point de vente Maképé",
    ville: "Douala",
    adresse: "Rue des Écoles, Maképé",
    telephone: "+237 6 90 12 77 05",
    actif: true,
  },
];

type CatalogueItem = {
  nom: string;
  categorie: string;
  prixAchat: number;
  prixVente: number;
  unite: string;
  seuil: number;
};

const catalogue: CatalogueItem[] = [
  { nom: "Coca-Cola 50cl", categorie: "Boissons", prixAchat: 350, prixVente: 600, unite: "casier", seuil: 24 },
  { nom: "Eau minérale 1,5L", categorie: "Boissons", prixAchat: 250, prixVente: 500, unite: "pack", seuil: 24 },
  { nom: "Jus Top Ananas 1L", categorie: "Boissons", prixAchat: 700, prixVente: 1100, unite: "bouteille", seuil: 12 },
  { nom: "Bière Castel 65cl", categorie: "Boissons", prixAchat: 700, prixVente: 1000, unite: "casier", seuil: 18 },
  { nom: "Riz parfumé 5kg", categorie: "Épicerie", prixAchat: 3500, prixVente: 4500, unite: "sac", seuil: 8 },
  { nom: "Huile végétale 1L", categorie: "Épicerie", prixAchat: 1200, prixVente: 1700, unite: "bouteille", seuil: 10 },
  { nom: "Sucre en poudre 1kg", categorie: "Épicerie", prixAchat: 700, prixVente: 950, unite: "paquet", seuil: 12 },
  { nom: "Lait en poudre 400g", categorie: "Épicerie", prixAchat: 1800, prixVente: 2400, unite: "boîte", seuil: 8 },
  { nom: "Savon Camay", categorie: "Hygiène", prixAchat: 300, prixVente: 500, unite: "pièce", seuil: 15 },
  { nom: "Détergent Omo 1kg", categorie: "Hygiène", prixAchat: 900, prixVente: 1300, unite: "paquet", seuil: 10 },
  { nom: "Dentifrice Signal", categorie: "Hygiène", prixAchat: 500, prixVente: 800, unite: "tube", seuil: 12 },
  { nom: "Papier hygiénique x4", categorie: "Hygiène", prixAchat: 600, prixVente: 1000, unite: "pack", seuil: 10 },
  { nom: "Piles AA (x2)", categorie: "Quincaillerie", prixAchat: 400, prixVente: 700, unite: "pack", seuil: 10 },
  { nom: "Ampoule LED 9W", categorie: "Quincaillerie", prixAchat: 900, prixVente: 1500, unite: "pièce", seuil: 8 },
  { nom: "Crème Nivea 200ml", categorie: "Cosmétique", prixAchat: 1500, prixVente: 2200, unite: "pot", seuil: 8 },
  { nom: "Parfum local 50ml", categorie: "Cosmétique", prixAchat: 1200, prixVente: 2500, unite: "flacon", seuil: 6 },
  { nom: "Cahier 200 pages", categorie: "Papeterie", prixAchat: 400, prixVente: 650, unite: "pièce", seuil: 20 },
  { nom: "Stylo Bic", categorie: "Papeterie", prixAchat: 100, prixVente: 200, unite: "pièce", seuil: 30 },
];

const clients: Client[] = [
  { id: "cl-1", nom: "Établissement Nguema", telephone: "+237 6 55 12 34 56", email: "contact@nguema.cm", adresse: "Bonapriso, Douala", dette: 0, createdAt: new Date().toISOString() },
  { id: "cl-2", nom: "Restaurant Le Wouri", telephone: "+237 6 78 45 67 89", email: "compta@lewouri.cm", adresse: "Akwa, Douala", dette: 0, createdAt: new Date().toISOString() },
  { id: "cl-3", nom: "Mme Abena", telephone: "+237 6 90 23 45 67", adresse: "Maképé, Douala", dette: 0, createdAt: new Date().toISOString() },
  { id: "cl-4", nom: "Kiosque Bonamoussadi", telephone: "+237 6 55 98 76 54", adresse: "Bonamoussadi, Douala", dette: 0, createdAt: new Date().toISOString() },
  { id: "cl-5", nom: "SARL Douala Fresh", telephone: "+237 6 77 33 22 11", email: "achats@doualafresh.cm", adresse: "Bonabéri, Douala", dette: 0, createdAt: new Date().toISOString() },
  { id: "cl-6", nom: "Hôtel Sawa", telephone: "+237 6 99 88 77 66", email: "direction@hotelsawa.cm", adresse: "Bonanjo, Douala", dette: 0, createdAt: new Date().toISOString() },
];

const produits: Produit[] = [];
for (const b of boutiques) {
  const code = b.id.replace("bq-", "").slice(0, 3).toUpperCase();
  catalogue.forEach((item, idx) => {
    const include = b.id === "bq-akwa" ? true : idx % 3 !== 0;
    if (!include) return;
    produits.push({
      id: `pr-${b.id.replace("bq-", "")}-${idx + 1}`,
      boutiqueId: b.id,
      nom: item.nom,
      sku: `${code}-${String(idx + 1).padStart(3, "0")}`,
      categorie: item.categorie,
      prixAchat: item.prixAchat,
      prixVente: item.prixVente,
      stock: randInt(4, 70),
      seuil: item.seuil,
      unite: item.unite,
    });
  });
}

produits[1].stock = 0;
produits[4].stock = 3;
produits[9].stock = 5;
produits[15].stock = 2;

const modeWeights: { mode: ModePaiement; poids: number }[] = [
  { mode: "espece", poids: 45 },
  { mode: "mtn_momo", poids: 25 },
  { mode: "orange_money", poids: 20 },
  { mode: "credit", poids: 10 },
];

function tirerMode(): ModePaiement {
  const total = modeWeights.reduce((s, m) => s + m.poids, 0);
  let r = rand() * total;
  for (const m of modeWeights) {
    r -= m.poids;
    if (r <= 0) return m.mode;
  }
  return "espece";
}

const now = new Date();
const ventes: Vente[] = [];

for (let jours = 20; jours >= 0; jours--) {
  for (const b of boutiques) {
    const base = b.id === "bq-akwa" ? 5 : 3;
    const nb = randInt(Math.max(1, base - 2), base + 2);
    for (let v = 0; v < nb; v++) {
      const dispo = produits.filter((p) => p.boutiqueId === b.id);
      const nbLignes = randInt(1, 3);
      const lignes: LigneDocument[] = [];
      for (let l = 0; l < nbLignes; l++) {
        const p = pick(dispo);
        if (lignes.some((x) => x.produitId === p.id)) continue;
        const qte = randInt(1, 3);
        lignes.push({ produitId: p.id, nom: p.nom, prixUnitaire: p.prixVente, quantite: qte });
      }
      if (lignes.length === 0) continue;
      const total = lignes.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0);
      const mode = tirerMode();
      const client = mode === "credit" ? pick(clients) : undefined;
      const d = new Date(now);
      d.setDate(d.getDate() - jours);
      d.setHours(randInt(8, 19), randInt(0, 59), 0, 0);
      ventes.push({
        id: `vt-${jours}-${b.id}-${v}`,
        numero: "",
        boutiqueId: b.id,
        date: d.toISOString(),
        lignes,
        total,
        modePaiement: mode,
        statut: mode === "credit" ? "credit" : "payee",
        clientId: client?.id,
        clientNom: client?.nom,
        clientTel: client?.telephone,
      });
    }
  }
}

ventes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
ventes.forEach((v, i) => {
  v.numero = `V-${new Date(v.date).getFullYear()}-${String(i + 1).padStart(4, "0")}`;
});

const statuts: Facture["statut"][] = ["envoyee", "payee", "retard", "envoyee", "payee", "retard"];
const factures: Facture[] = [];

for (let i = 0; i < 6; i++) {
  const b = boutiques[i % boutiques.length];
  const client = clients[i % clients.length];
  const dispo = produits.filter((p) => p.boutiqueId === b.id);
  const lignes: LigneDocument[] = [];
  const nbLignes = randInt(2, 4);
  for (let l = 0; l < nbLignes; l++) {
    const p = pick(dispo);
    if (lignes.some((x) => x.produitId === p.id)) continue;
    lignes.push({ produitId: p.id, nom: p.nom, prixUnitaire: p.prixVente, quantite: randInt(2, 10) });
  }
  const sousTotal = lignes.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0);
  const tva = Math.round(sousTotal * 0.1925);
  const d = new Date(now);
  d.setDate(d.getDate() - randInt(3, 18));
  const echeance = new Date(d);
  echeance.setDate(echeance.getDate() + 15);
  factures.push({
    id: `fc-${i + 1}`,
    numero: `F-${d.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
    boutiqueId: b.id,
    clientId: client.id,
    clientNom: client.nom,
    clientTel: client.telephone,
    date: d.toISOString(),
    echeance: echeance.toISOString(),
    lignes,
    sousTotal,
    tva,
    total: sousTotal + tva,
    statut: statuts[i],
  });
}

const paiements: Paiement[] = [];

function operateurDe(mode: ModePaiement): Operateur {
  if (mode === "mtn_momo") return "mtn_momo";
  if (mode === "orange_money") return "orange_money";
  return "espece";
}

ventes.forEach((v, i) => {
  if (v.statut === "payee") {
    paiements.push({
      id: `pm-v-${i}`,
      reference: `PAY-${String(100000 + i)}`,
      date: v.date,
      operateur: operateurDe(v.modePaiement),
      montant: v.total,
      telephone: v.clientTel ?? "+237 6 55 00 00 00",
      venteId: v.id,
      statut: "reussi",
    });
  }
});

factures.forEach((f, i) => {
  if (f.statut === "payee") {
    paiements.push({
      id: `pm-f-${i}`,
      reference: `PAY-${String(200000 + i)}`,
      date: f.date,
      operateur: "mtn_momo",
      montant: f.total,
      telephone: f.clientTel ?? "+237 6 78 00 00 00",
      factureId: f.id,
      statut: "reussi",
    });
  }
});

const statutsDevis: Devis["statut"][] = ["brouillon", "envoye", "accepte"];
const devis: Devis[] = [];

for (let i = 0; i < 3; i++) {
  const b = boutiques[i % boutiques.length];
  const client = clients[(i + 2) % clients.length];
  const dispo = produits.filter((p) => p.boutiqueId === b.id);
  const lignes: LigneDocument[] = [];
  const nbLignes = randInt(2, 3);
  for (let l = 0; l < nbLignes; l++) {
    const p = pick(dispo);
    if (lignes.some((x) => x.produitId === p.id)) continue;
    lignes.push({ produitId: p.id, nom: p.nom, prixUnitaire: p.prixVente, quantite: randInt(2, 8) });
  }
  const sousTotal = lignes.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0);
  const tva = Math.round(sousTotal * 0.1925);
  const d = new Date(now);
  d.setDate(d.getDate() - randInt(1, 10));
  const validite = new Date(d);
  validite.setDate(validite.getDate() + 15);
  devis.push({
    id: `dv-${i + 1}`,
    numero: `D-${d.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
    boutiqueId: b.id,
    clientId: client.id,
    clientNom: client.nom,
    clientTel: client.telephone,
    date: d.toISOString(),
    validite: validite.toISOString(),
    lignes,
    sousTotal,
    tva,
    total: sousTotal + tva,
    statut: statutsDevis[i],
  });
}

export const seedState: AppState = {
  boutiques,
  produits,
  ventes,
  factures,
  devis,
  clients,
  rappels: [],
  paiements,
  parametres: {
    entreprise: "Groupe Sawa Distribution",
    ville: "Douala",
    telephone: "+237 6 55 41 20 18",
    tva: 19.25,
    operateurs: { mtn: true, orange: true },
    rappelAuto: true,
    rappelJours: 7,
  },
  boutiqueActiveId: "all",
  utilisateur: null,
};

export { catalogue, clients, devis };
