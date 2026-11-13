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
    const devis = await prisma.devis.findUnique({
      where: { id },
      include: { lignes: true, boutique: true },
    });
    if (!devis) return fail("Devis introuvable.", 404);
    if (!(await peutAccederBoutique(acces.session, devis.boutiqueId))) {
      return fail("Devis non autorisé.", 403);
    }

    const p = await prisma.parametres.findUnique({ where: { id: 1 } });

    const bytes = await genererDocumentPdf({
      type: "devis",
      numero: devis.numero,
      date: devis.date,
      validite: devis.validite,
      clientNom: devis.clientNom,
      clientTel: devis.clientTel ?? undefined,
      boutiqueNom: devis.boutique.nom,
      sousTotal: devis.sousTotal,
      tva: devis.tva,
      total: devis.total,
      lignes: devis.lignes.map((l) => ({
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
        "Content-Disposition": `inline; filename="devis-${devis.numero}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
