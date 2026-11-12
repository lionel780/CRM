import type { PrismaClient } from "@prisma/client";
import { seedState } from "../seed";
import { seedUtilisateurs } from "./auth";

export async function seedDatabase(prisma: PrismaClient): Promise<boolean> {
  await seedUtilisateurs(prisma);

  const count = await prisma.boutique.count();
  if (count > 0) return false;

  const p = seedState.parametres;

  await prisma.$transaction(async (tx) => {
    await tx.parametres.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        entreprise: p.entreprise,
        ville: p.ville,
        telephone: p.telephone,
        tva: p.tva,
        mtn: p.operateurs.mtn,
        orange: p.operateurs.orange,
        rappelAuto: p.rappelAuto,
        rappelJours: p.rappelJours,
        whatsappModele: p.whatsappModele ?? null,
      },
    });

    for (const c of seedState.clients) {
      await tx.client.create({
        data: {
          id: c.id,
          nom: c.nom,
          telephone: c.telephone ?? null,
          email: c.email ?? null,
          adresse: c.adresse ?? null,
        },
      });
    }

    for (const b of seedState.boutiques) {
      await tx.boutique.create({
        data: {
          id: b.id,
          nom: b.nom,
          ville: b.ville,
          adresse: b.adresse,
          telephone: b.telephone,
          actif: b.actif,
        },
      });
    }

    for (const prod of seedState.produits) {
      await tx.produit.create({
        data: {
          id: prod.id,
          boutiqueId: prod.boutiqueId,
          nom: prod.nom,
          sku: prod.sku,
          categorie: prod.categorie,
          prixAchat: prod.prixAchat,
          prixVente: prod.prixVente,
          stock: prod.stock,
          seuil: prod.seuil,
          unite: prod.unite,
        },
      });
    }

    for (const v of seedState.ventes) {
      await tx.vente.create({
        data: {
          id: v.id,
          numero: v.numero,
          boutiqueId: v.boutiqueId,
          date: new Date(v.date),
          total: v.total,
          modePaiement: v.modePaiement,
          statut: v.statut,
          clientId: v.clientId ?? null,
          clientNom: v.clientNom ?? null,
          clientTel: v.clientTel ?? null,
          lignes: {
            create: v.lignes.map((l) => ({
              produitId: l.produitId || null,
              nom: l.nom,
              prixUnitaire: l.prixUnitaire,
              quantite: l.quantite,
            })),
          },
        },
      });
    }

    for (const f of seedState.factures) {
      await tx.facture.create({
        data: {
          id: f.id,
          numero: f.numero,
          boutiqueId: f.boutiqueId,
          clientId: f.clientId ?? null,
          clientNom: f.clientNom,
          clientTel: f.clientTel ?? null,
          date: new Date(f.date),
          echeance: new Date(f.echeance),
          sousTotal: f.sousTotal,
          tva: f.tva,
          total: f.total,
          statut: f.statut,
          lignes: {
            create: f.lignes.map((l) => ({
              produitId: l.produitId || null,
              nom: l.nom,
              prixUnitaire: l.prixUnitaire,
              quantite: l.quantite,
            })),
          },
        },
      });
    }

    for (const d of seedState.devis) {
      await tx.devis.create({
        data: {
          id: d.id,
          numero: d.numero,
          boutiqueId: d.boutiqueId,
          clientId: d.clientId ?? null,
          clientNom: d.clientNom,
          clientTel: d.clientTel ?? null,
          date: new Date(d.date),
          validite: new Date(d.validite),
          sousTotal: d.sousTotal,
          tva: d.tva,
          total: d.total,
          statut: d.statut,
          lignes: {
            create: d.lignes.map((l) => ({
              produitId: l.produitId || null,
              nom: l.nom,
              prixUnitaire: l.prixUnitaire,
              quantite: l.quantite,
            })),
          },
        },
      });
    }

    for (const pa of seedState.paiements) {
      await tx.paiement.create({
        data: {
          id: pa.id,
          reference: pa.reference,
          date: new Date(pa.date),
          operateur: pa.operateur,
          montant: pa.montant,
          telephone: pa.telephone,
          statut: pa.statut,
          venteId: pa.venteId ?? null,
          factureId: pa.factureId ?? null,
        },
      });
    }
  }, { timeout: 120000, maxWait: 10000 });

  return true;
}
