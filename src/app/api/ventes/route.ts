import { prisma } from "@/lib/server/prisma";
import { mapVente } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, nouveauReference, ok } from "@/lib/server/http";
import { operateurDeMode, prochainNumeroVente } from "@/lib/server/queries";
import { verifierAcces } from "@/lib/server/auth-guard";
import { resoudreClient } from "@/lib/server/clients";
import { peutAccederBoutique } from "@/lib/server/tenants";

export const runtime = "nodejs";

type Corps = {
  boutiqueId?: string;
  lignes?: { produitId?: string; quantite?: number }[];
  modePaiement?: string;
  clientId?: string;
  clientNom?: string;
  clientTel?: string;
};

const MODES = ["espece", "mtn_momo", "orange_money", "credit"];

export async function POST(req: Request) {
  try {
    const acces = await verifierAcces(["super_admin", "gerant", "vendeur"]);
    if (acces.response) return acces.response;
    const session = acces.session;

    const b = await lireJson<Corps>(req);
    if (!b.boutiqueId) return fail("Sélectionnez une boutique.");
    if (session.role === "vendeur" && session.boutiqueId && b.boutiqueId !== session.boutiqueId) {
      return fail("Vous ne pouvez vendre que dans votre boutique.", 403);
    }
    if (!(await peutAccederBoutique(session, b.boutiqueId))) {
      return fail("Boutique non autorisée.", 403);
    }
    if (!Array.isArray(b.lignes) || b.lignes.length === 0) return fail("Le panier est vide.");

    const mode = b.modePaiement ?? "espece";
    if (!MODES.includes(mode)) return fail("Mode de paiement invalide.");

    const boutique = await prisma.boutique.findUnique({ where: { id: b.boutiqueId } });
    if (!boutique) return fail("Boutique introuvable.", 404);

    const quantites = new Map<string, number>();
    for (const l of b.lignes) {
      if (!l.produitId) return fail("Ligne de vente invalide.");
      const q = Math.max(1, Math.round(Number(l.quantite) || 1));
      quantites.set(l.produitId, (quantites.get(l.produitId) ?? 0) + q);
    }

    const produits = await prisma.produit.findMany({
      where: { id: { in: Array.from(quantites.keys()) } },
    });
    const parId = new Map(produits.map((p) => [p.id, p]));

    const lignes = Array.from(quantites.entries()).map(([produitId, quantite]) => {
      const p = parId.get(produitId);
      if (!p) throw new Error("Un produit du panier est introuvable.");
      if (p.boutiqueId !== b.boutiqueId) {
        throw new Error(`Le produit « ${p.nom} » n'appartient pas à cette boutique.`);
      }
      if (p.stock < quantite) {
        throw new Error(`Stock insuffisant pour « ${p.nom} » (${p.stock} restant).`);
      }
      return { produitId, nom: p.nom, prixUnitaire: p.prixVente, quantite };
    });

    const total = lignes.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0);
    const numero = await prochainNumeroVente();
    const client = await resoudreClient(prisma, b.boutiqueId, b.clientId, b.clientNom, b.clientTel);
    const clientNom = client?.nom ?? b.clientNom?.trim() ?? null;
    const clientTel = client?.telephone ?? b.clientTel?.trim() ?? null;

    const vente = await prisma.$transaction(async (tx) => {
      for (const l of lignes) {
        await tx.produit.update({
          where: { id: l.produitId },
          data: { stock: { decrement: l.quantite } },
        });
      }

      const cree = await tx.vente.create({
        data: {
          numero,
          boutiqueId: b.boutiqueId as string,
          total,
          modePaiement: mode,
          statut: mode === "credit" ? "credit" : "payee",
          clientId: client?.id ?? null,
          clientNom,
          clientTel,
          lignes: { create: lignes },
        },
        include: { lignes: true },
      });

      if (mode !== "credit") {
        await tx.paiement.create({
          data: {
            reference: nouveauReference(),
            operateur: operateurDeMode(mode),
            montant: total,
            telephone: clientTel ?? "+237 6 00 00 00 00",
            statut: "reussi",
            venteId: cree.id,
          },
        });
      }

      return cree;
    }, { timeout: 20000, maxWait: 10000 });

    return ok(mapVente(vente), 201);
  } catch (e) {
    return fail(messageErreur(e), 400);
  }
}
