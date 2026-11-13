import { prisma } from "@/lib/server/prisma";
import { fail, messageErreur, ok } from "@/lib/server/http";
import { verifierAcces } from "@/lib/server/auth-guard";
import { peutAccederBoutique } from "@/lib/server/tenants";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["super_admin", "gerant"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    const existe = await prisma.facture.findUnique({ where: { id } });
    if (!existe) return fail("Facture introuvable.", 404);
    if (!(await peutAccederBoutique(acces.session, existe.boutiqueId))) {
      return fail("Facture non autorisée.", 403);
    }
    await prisma.facture.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
