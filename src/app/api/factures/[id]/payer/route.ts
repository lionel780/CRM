import { prisma } from "@/lib/server/prisma";
import { mapFacture } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, nouveauReference, ok } from "@/lib/server/http";

export const runtime = "nodejs";

type Corps = { operateur?: string; telephone?: string };
const OPERATEURS = ["mtn_momo", "orange_money", "espece"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const b = await lireJson<Corps>(req);
    const operateur = b.operateur ?? "mtn_momo";
    if (!OPERATEURS.includes(operateur)) return fail("Opérateur invalide.");

    const facture = await prisma.facture.findUnique({ where: { id }, include: { lignes: true } });
    if (!facture) return fail("Facture introuvable.", 404);

    if (facture.statut === "payee") return ok(mapFacture(facture));

    const maj = await prisma.$transaction(async (tx) => {
      await tx.paiement.create({
        data: {
          reference: nouveauReference(),
          operateur,
          montant: facture.total,
          telephone: b.telephone?.trim() || facture.clientTel || "+237 6 00 00 00 00",
          statut: "reussi",
          factureId: facture.id,
        },
      });
      return tx.facture.update({
        where: { id: facture.id },
        data: { statut: "payee" },
        include: { lignes: true },
      });
    }, { timeout: 20000, maxWait: 10000 });

    return ok(mapFacture(maj));
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
