import { prisma } from "@/lib/server/prisma";
import { mapFacture } from "@/lib/server/dto";
import { fail, messageErreur, ok } from "@/lib/server/http";
import { prochainNumeroFacture } from "@/lib/server/queries";
import { verifierAcces } from "@/lib/server/auth-guard";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["admin"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    const devis = await prisma.devis.findUnique({ where: { id }, include: { lignes: true } });
    if (!devis) return fail("Devis introuvable.", 404);

    const numero = await prochainNumeroFacture();
    const echeance = new Date(Date.now() + 15 * 86_400_000);

    const facture = await prisma.$transaction(async (tx) => {
      const cree = await tx.facture.create({
        data: {
          numero,
          boutiqueId: devis.boutiqueId,
          clientId: devis.clientId,
          clientNom: devis.clientNom,
          clientTel: devis.clientTel,
          echeance,
          sousTotal: devis.sousTotal,
          tva: devis.tva,
          total: devis.total,
          statut: "envoyee",
          lignes: {
            create: devis.lignes.map((l) => ({
              produitId: l.produitId,
              nom: l.nom,
              prixUnitaire: l.prixUnitaire,
              quantite: l.quantite,
            })),
          },
        },
        include: { lignes: true },
      });

      await tx.devis.update({ where: { id: devis.id }, data: { statut: "accepte" } });
      return cree;
    });

    return ok(mapFacture(facture), 201);
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
