import { prisma } from "@/lib/server/prisma";
import { fail, messageErreur } from "@/lib/server/http";
import { genererDocumentPdf } from "@/lib/server/pdf";
import { libelleMode } from "@/lib/server/queries";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const vente = await prisma.vente.findUnique({
      where: { id },
      include: { lignes: true, boutique: true },
    });
    if (!vente) return fail("Vente introuvable.", 404);

    const p = await prisma.parametres.findUnique({ where: { id: 1 } });

    const bytes = await genererDocumentPdf({
      type: "recu",
      numero: vente.numero,
      date: vente.date,
      clientNom: vente.clientNom ?? "Client comptoir",
      clientTel: vente.clientTel ?? undefined,
      boutiqueNom: vente.boutique.nom,
      sousTotal: vente.total,
      total: vente.total,
      modePaiement: libelleMode(vente.modePaiement),
      lignes: vente.lignes.map((l) => ({
        nom: l.nom,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
      })),
      logo: p?.logo ?? undefined,
      entreprise: {
        nom: p?.entreprise ?? "Mon entreprise",
        ville: p?.ville ?? "Douala",
        telephone: p?.telephone ?? "",
      },
    });

    return new Response(new Blob([bytes], { type: "application/pdf" }), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="recu-${vente.numero}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
