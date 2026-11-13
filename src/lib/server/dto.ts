import type {
  Boutique as PBoutique,
  Client as PClient,
  Devis as PDevis,
  DevisLigne,
  Facture as PFacture,
  FactureLigne,
  Paiement as PPaiement,
  Parametres as PParametres,
  Produit as PProduit,
  Rappel as PRappel,
  Utilisateur as PUtilisateur,
  Vente as PVente,
  VenteLigne,
} from "@prisma/client";
import type {
  Boutique,
  Client,
  Devis,
  Facture,
  Paiement,
  Parametres,
  Produit,
  Rappel,
  Utilisateur,
  Vente,
} from "../types";

export type VenteAvecLignes = PVente & { lignes: VenteLigne[] };
export type FactureAvecLignes = PFacture & { lignes: FactureLigne[] };
export type DevisAvecLignes = PDevis & { lignes: DevisLigne[] };

export function mapBoutique(b: PBoutique, gerantNom?: string): Boutique {
  return {
    id: b.id,
    nom: b.nom,
    ville: b.ville,
    adresse: b.adresse,
    telephone: b.telephone,
    actif: b.actif,
    gerantId: b.gerantId ?? undefined,
    gerantNom,
  };
}

export function mapProduit(p: PProduit): Produit {
  return {
    id: p.id,
    boutiqueId: p.boutiqueId,
    nom: p.nom,
    sku: p.sku,
    categorie: p.categorie,
    prixAchat: p.prixAchat,
    prixVente: p.prixVente,
    stock: p.stock,
    seuil: p.seuil,
    unite: p.unite,
  };
}

export function mapVente(v: VenteAvecLignes): Vente {
  return {
    id: v.id,
    numero: v.numero,
    boutiqueId: v.boutiqueId,
    date: v.date.toISOString(),
    total: v.total,
    modePaiement: v.modePaiement as Vente["modePaiement"],
    statut: v.statut as Vente["statut"],
    clientId: v.clientId ?? undefined,
    clientNom: v.clientNom ?? undefined,
    clientTel: v.clientTel ?? undefined,
    lignes: v.lignes.map((l) => ({
      produitId: l.produitId ?? "",
      nom: l.nom,
      prixUnitaire: l.prixUnitaire,
      quantite: l.quantite,
    })),
  };
}

export function mapFacture(f: FactureAvecLignes): Facture {
  return {
    id: f.id,
    numero: f.numero,
    boutiqueId: f.boutiqueId,
    clientId: f.clientId ?? undefined,
    clientNom: f.clientNom,
    clientTel: f.clientTel ?? undefined,
    date: f.date.toISOString(),
    echeance: f.echeance.toISOString(),
    sousTotal: f.sousTotal,
    tva: f.tva,
    total: f.total,
    statut: f.statut as Facture["statut"],
    lignes: f.lignes.map((l) => ({
      produitId: l.produitId ?? "",
      nom: l.nom,
      prixUnitaire: l.prixUnitaire,
      quantite: l.quantite,
    })),
  };
}

export function mapDevis(d: DevisAvecLignes): Devis {
  return {
    id: d.id,
    numero: d.numero,
    boutiqueId: d.boutiqueId,
    clientId: d.clientId ?? undefined,
    clientNom: d.clientNom,
    clientTel: d.clientTel ?? undefined,
    date: d.date.toISOString(),
    validite: d.validite.toISOString(),
    sousTotal: d.sousTotal,
    tva: d.tva,
    total: d.total,
    statut: d.statut as Devis["statut"],
    lignes: d.lignes.map((l) => ({
      produitId: l.produitId ?? "",
      nom: l.nom,
      prixUnitaire: l.prixUnitaire,
      quantite: l.quantite,
    })),
  };
}

export function mapClient(c: PClient, dette = 0): Client {
  return {
    id: c.id,
    boutiqueId: c.boutiqueId ?? undefined,
    nom: c.nom,
    telephone: c.telephone ?? undefined,
    email: c.email ?? undefined,
    adresse: c.adresse ?? undefined,
    dette,
    createdAt: c.createdAt.toISOString(),
  };
}

export function mapRappel(r: PRappel): Rappel {
  return {
    id: r.id,
    clientId: r.clientId,
    type: r.type === "manuel" ? "manuel" : "auto",
    canal: "whatsapp",
    message: r.message,
    montant: r.montant,
    statut: r.statut === "envoye" ? "envoye" : "en_attente",
    date: r.date.toISOString(),
    envoyeLe: r.envoyeLe?.toISOString(),
  };
}

export function mapUtilisateur(u: PUtilisateur, boutiqueNom?: string): Utilisateur {
  const role: Utilisateur["role"] =
    u.role === "super_admin" ? "super_admin" : u.role === "gerant" ? "gerant" : "vendeur";
  return {
    id: u.id,
    nom: u.nom,
    identifiant: u.identifiant,
    role,
    boutiqueId: u.boutiqueId ?? undefined,
    boutiqueNom,
    actif: u.actif,
    createdAt: u.createdAt.toISOString(),
  };
}

export function mapPaiement(p: PPaiement): Paiement {
  return {
    id: p.id,
    reference: p.reference,
    date: p.date.toISOString(),
    operateur: p.operateur as Paiement["operateur"],
    montant: p.montant,
    telephone: p.telephone,
    factureId: p.factureId ?? undefined,
    venteId: p.venteId ?? undefined,
    statut: p.statut as Paiement["statut"],
  };
}

export function mapParametres(p: PParametres | null): Parametres {
  if (!p) {
    return {
      entreprise: "Mon entreprise",
      ville: "Douala",
      telephone: "+237 6 00 00 00 00",
      tva: 19.25,
      operateurs: { mtn: true, orange: true },
      rappelAuto: true,
      rappelJours: 7,
    };
  }
  return {
    entreprise: p.entreprise,
    ville: p.ville,
    telephone: p.telephone,
    tva: p.tva,
    operateurs: { mtn: p.mtn, orange: p.orange },
    logo: p.logo ?? undefined,
    rappelAuto: p.rappelAuto,
    rappelJours: p.rappelJours,
    whatsappModele: p.whatsappModele ?? undefined,
  };
}
