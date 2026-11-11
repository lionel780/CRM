import { prisma } from "@/lib/server/prisma";
import { mapProduit } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";

export const runtime = "nodejs";

type Corps = {
  boutiqueId?: string;
  nom?: string;
  sku?: string;
  categorie?: string;
  prixAchat?: number;
  prixVente?: number;
  stock?: number;
  seuil?: number;
  unite?: string;
};

export async function POST(req: Request) {
  try {
    const b = await lireJson<Corps>(req);
    if (!b.nom?.trim()) return fail("Le nom du produit est obligatoire.");
    if (!b.boutiqueId) return fail("Sélectionnez une boutique.");
    if (!b.prixVente || b.prixVente <= 0) return fail("Le prix de vente doit être supérieur à 0.");

    const boutique = await prisma.boutique.findUnique({ where: { id: b.boutiqueId } });
    if (!boutique) return fail("Boutique introuvable.", 404);

    const cree = await prisma.produit.create({
      data: {
        boutiqueId: b.boutiqueId,
        nom: b.nom.trim(),
        sku: b.sku?.trim() || `SKU-${Date.now().toString().slice(-6)}`,
        categorie: b.categorie?.trim() || "Divers",
        prixAchat: Math.max(0, Math.round(b.prixAchat ?? 0)),
        prixVente: Math.round(b.prixVente),
        stock: Math.max(0, Math.round(b.stock ?? 0)),
        seuil: Math.max(0, Math.round(b.seuil ?? 0)),
        unite: b.unite?.trim() || "pièce",
      },
    });
    return ok(mapProduit(cree), 201);
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
