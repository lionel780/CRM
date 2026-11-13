import { prisma } from "@/lib/server/prisma";
import { fail, messageErreur } from "@/lib/server/http";
import { genererDocumentPdf } from "@/lib/server/pdf";
import { verifierAcces } from "@/lib/server/auth-guard";
import { peutAccederBoutique } from "@/lib/server/tenants";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["super_admin", "gerant"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    const facture = await prisma.facture.findUnique({
      where: { id },
      include: { lignes: true, boutique: true },
    });
    if (!facture) return fail("Facture introuvable.", 404);
    if (!(await peutAccederBoutique(acces.session, facture.boutiqueId))) {
      return fail("Facture non autorisée.", 403);
    }

    const p = await prisma.parametres.findUnique({ where: { id: 1 } });

    const bytes = await genererDocumentPdf({
      type: "facture",
      numero: facture.numero,
      date: facture.date,
      echeance: facture.echeance,
      clientNom: facture.clientNom,
      clientTel: facture.clientTel ?? undefined,
      boutiqueNom: facture.boutique.nom,
      sousTotal: facture.sousTotal,
      tva: facture.tva,
      total: facture.total,
      lignes: facture.lignes.map((l) => ({
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
        "Content-Disposition": `inline; filename="facture-${facture.numero}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
