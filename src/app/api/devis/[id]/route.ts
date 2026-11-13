import { prisma } from "@/lib/server/prisma";
import { mapDevis } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";
import { verifierAcces } from "@/lib/server/auth-guard";
import { peutAccederBoutique } from "@/lib/server/tenants";

export const runtime = "nodejs";

const STATUTS = ["brouillon", "envoye", "accepte", "refuse"];

type Corps = { statut?: string };

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["super_admin", "gerant"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    const b = await lireJson<Corps>(req);
    const existe = await prisma.devis.findUnique({ where: { id } });
    if (!existe) return fail("Devis introuvable.", 404);
    if (!(await peutAccederBoutique(acces.session, existe.boutiqueId))) {
      return fail("Devis non autorisé.", 403);
    }
    if (!b.statut || !STATUTS.includes(b.statut)) return fail("Statut de devis invalide.");

    const maj = await prisma.devis.update({
      where: { id },
      data: { statut: b.statut },
      include: { lignes: true },
    });
    return ok(mapDevis(maj));
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["super_admin", "gerant"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    const existe = await prisma.devis.findUnique({ where: { id } });
    if (!existe) return fail("Devis introuvable.", 404);
    if (!(await peutAccederBoutique(acces.session, existe.boutiqueId))) {
      return fail("Devis non autorisé.", 403);
    }
    await prisma.devis.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
