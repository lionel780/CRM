import { prisma } from "@/lib/server/prisma";
import { mapFacture } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";
import { prochainNumeroFacture } from "@/lib/server/queries";
import { verifierAcces } from "@/lib/server/auth-guard";
import { resoudreClient } from "@/lib/server/clients";

export const runtime = "nodejs";

type Corps = {
  boutiqueId?: string;
  clientId?: string;
  clientNom?: string;
  clientTel?: string;
  echeance?: string;
  lignes?: { produitId?: string; quantite?: number }[];
};

export async function POST(req: Request) {
  try {
    const acces = await verifierAcces(["admin"]);
    if (acces.response) return acces.response;

    const b = await lireJson<Corps>(req);
    if (!b.boutiqueId) return fail("Sélectionnez une boutique.");
    if (!b.clientNom?.trim()) return fail("Le nom du client est obligatoire.");
    if (!Array.isArray(b.lignes) || b.lignes.length === 0) return fail("Ajoutez au moins un produit.");

    const boutique = await prisma.boutique.findUnique({ where: { id: b.boutiqueId } });
    if (!boutique) return fail("Boutique introuvable.", 404);

    const quantites = new Map<string, number>();
    for (const l of b.lignes) {
      if (!l.produitId) return fail("Ligne de facture invalide.");
      const q = Math.max(1, Math.round(Number(l.quantite) || 1));
      quantites.set(l.produitId, (quantites.get(l.produitId) ?? 0) + q);
    }

    const produits = await prisma.produit.findMany({
      where: { id: { in: Array.from(quantites.keys()) } },
    });
    const parId = new Map(produits.map((p) => [p.id, p]));

    const lignes = Array.from(quantites.entries()).map(([produitId, quantite]) => {
      const p = parId.get(produitId);
      if (!p) throw new Error("Un produit de la facture est introuvable.");
      return { produitId, nom: p.nom, prixUnitaire: p.prixVente, quantite };
    });

    const sousTotal = lignes.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0);
    const parametres = await prisma.parametres.findUnique({ where: { id: 1 } });
    const taux = parametres?.tva ?? 19.25;
    const tva = Math.round((sousTotal * taux) / 100);
    const numero = await prochainNumeroFacture();
    const client = await resoudreClient(prisma, b.clientId, b.clientNom, b.clientTel);

    const echeance = b.echeance ? new Date(b.echeance) : new Date(Date.now() + 15 * 86_400_000);

    const facture = await prisma.facture.create({
      data: {
        numero,
        boutiqueId: b.boutiqueId,
        clientId: client?.id ?? null,
        clientNom: client?.nom ?? b.clientNom.trim(),
        clientTel: client?.telephone ?? b.clientTel?.trim() ?? null,
        echeance: Number.isNaN(echeance.getTime()) ? new Date(Date.now() + 15 * 86_400_000) : echeance,
        sousTotal,
        tva,
        total: sousTotal + tva,
        statut: "envoyee",
        lignes: { create: lignes },
      },
      include: { lignes: true },
    });

    return ok(mapFacture(facture), 201);
  } catch (e) {
    return fail(messageErreur(e), 400);
  }
}
