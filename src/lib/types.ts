export type ModePaiement = "espece" | "mtn_momo" | "orange_money" | "credit";
export type StatutVente = "payee" | "credit";
export type StatutFacture = "brouillon" | "envoyee" | "payee" | "retard";
export type StatutDevis = "brouillon" | "envoye" | "accepte" | "refuse";
export type StatutPaiement = "reussi" | "en_attente" | "echoue";
export type Operateur = "mtn_momo" | "orange_money" | "espece";
export type Role = "super_admin" | "gerant" | "vendeur";

export interface Utilisateur {
  id: string;
  nom: string;
  identifiant: string;
  role: Role;
  boutiqueId?: string;
  boutiqueNom?: string;
  actif: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  boutiqueId?: string;
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  dette: number;
  createdAt: string;
}

export interface Boutique {
  id: string;
  nom: string;
  ville: string;
  adresse: string;
  telephone: string;
  actif: boolean;
  gerantId?: string;
  gerantNom?: string;
}

export interface Produit {
  id: string;
  boutiqueId: string;
  nom: string;
  sku: string;
  categorie: string;
  prixAchat: number;
  prixVente: number;
  stock: number;
  seuil: number;
  unite: string;
}

export interface LigneDocument {
  produitId: string;
  nom: string;
  prixUnitaire: number;
  quantite: number;
}

export interface Vente {
  id: string;
  numero: string;
  boutiqueId: string;
  date: string;
  lignes: LigneDocument[];
  total: number;
  modePaiement: ModePaiement;
  statut: StatutVente;
  clientId?: string;
  clientNom?: string;
  clientTel?: string;
}

export interface Facture {
  id: string;
  numero: string;
  boutiqueId: string;
  clientId?: string;
  clientNom: string;
  clientTel?: string;
  date: string;
  echeance: string;
  lignes: LigneDocument[];
  sousTotal: number;
  tva: number;
  total: number;
  statut: StatutFacture;
}

export interface Devis {
  id: string;
  numero: string;
  boutiqueId: string;
  clientId?: string;
  clientNom: string;
  clientTel?: string;
  date: string;
  validite: string;
  lignes: LigneDocument[];
  sousTotal: number;
  tva: number;
  total: number;
  statut: StatutDevis;
}

export interface Rappel {
  id: string;
  clientId: string;
  type: "auto" | "manuel";
  canal: "whatsapp";
  message: string;
  montant: number;
  statut: "en_attente" | "envoye";
  date: string;
  envoyeLe?: string;
}

export interface Paiement {
  id: string;
  reference: string;
  date: string;
  operateur: Operateur;
  montant: number;
  telephone: string;
  factureId?: string;
  venteId?: string;
  statut: StatutPaiement;
}

export interface Parametres {
  entreprise: string;
  ville: string;
  telephone: string;
  tva: number;
  operateurs: { mtn: boolean; orange: boolean };
  logo?: string;
  rappelAuto: boolean;
  rappelJours: number;
  whatsappModele?: string;
}

export interface AppState {
  boutiques: Boutique[];
  produits: Produit[];
  ventes: Vente[];
  factures: Facture[];
  devis: Devis[];
  clients: Client[];
  rappels: Rappel[];
  paiements: Paiement[];
  parametres: Parametres;
  boutiqueActiveId: string;
  utilisateur: Utilisateur | null;
  utilisateurs: Utilisateur[];
}

export type PanierLigne = { produitId: string; quantite: number };

export type NouvelleVente = {
  boutiqueId: string;
  lignes: LigneDocument[];
  modePaiement: ModePaiement;
  clientId?: string;
  clientNom?: string;
  clientTel?: string;
};

export type NouvelleFacture = {
  boutiqueId: string;
  clientId?: string;
  clientNom: string;
  clientTel?: string;
  echeance: string;
  lignes: LigneDocument[];
};

export type NouveauDevis = {
  boutiqueId: string;
  clientId?: string;
  clientNom: string;
  clientTel?: string;
  validite: string;
  lignes: LigneDocument[];
};
