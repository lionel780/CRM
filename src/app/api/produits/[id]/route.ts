import { prisma } from "@/lib/server/prisma";
import { mapProduit } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";

export const runtime = "nodejs";

type Corps = {
  stockDelta?: number;
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await lireJson<Corps>(req);
    const existe = await prisma.produit.findUnique({ where: { id } });
    if (!existe) return fail("Produit introuvable.", 404);

    if (typeof b.stockDelta === "number") {
      await prisma.$executeRaw`UPDATE "Produit" SET "stock" = MAX(0, "stock" + ${Math.round(b.stockDelta)}) WHERE "id" = ${id}`;
      const maj = await prisma.produit.findUnique({ where: { id } });
      return ok(mapProduit(maj ?? existe));
    }

    const data: Record<string, unknown> = {};
    if (typeof b.stock === "number") data.stock = Math.max(0, Math.round(b.stock));
    if (b.nom?.trim()) data.nom = b.nom.trim();
    if (b.sku?.trim()) data.sku = b.sku.trim();
    if (b.categorie?.trim()) data.categorie = b.categorie.trim();
    if (b.unite?.trim()) data.unite = b.unite.trim();
    if (typeof b.prixAchat === "number") data.prixAchat = Math.max(0, Math.round(b.prixAchat));
    if (typeof b.prixVente === "number" && b.prixVente > 0) data.prixVente = Math.round(b.prixVente);
    if (typeof b.seuil === "number") data.seuil = Math.max(0, Math.round(b.seuil));
    if (b.boutiqueId) data.boutiqueId = b.boutiqueId;

    const maj = await prisma.produit.update({ where: { id }, data });
    return ok(mapProduit(maj));
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existe = await prisma.produit.findUnique({ where: { id } });
    if (!existe) return fail("Produit introuvable.", 404);
    await prisma.produit.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
