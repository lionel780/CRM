import { prisma } from "@/lib/server/prisma";
import { mapBoutique } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";
import { verifierAcces } from "@/lib/server/auth-guard";
import { peutAccederBoutique } from "@/lib/server/tenants";

export const runtime = "nodejs";

type Corps = {
  nom?: string;
  ville?: string;
  adresse?: string;
  telephone?: string;
  actif?: boolean;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["super_admin", "gerant"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    if (!(await peutAccederBoutique(acces.session, id))) {
      return fail("Boutique non autorisée.", 403);
    }

    const b = await lireJson<Corps>(req);
    const existe = await prisma.boutique.findUnique({ where: { id } });
    if (!existe) return fail("Boutique introuvable.", 404);

    const maj = await prisma.boutique.update({
      where: { id },
      data: {
        nom: b.nom?.trim() ?? undefined,
        ville: b.ville?.trim() ?? undefined,
        adresse: b.adresse?.trim() ?? undefined,
        telephone: b.telephone?.trim() ?? undefined,
        actif: typeof b.actif === "boolean" ? b.actif : undefined,
      },
    });
    return ok(mapBoutique(maj));
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["super_admin", "gerant"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    if (!(await peutAccederBoutique(acces.session, id))) {
      return fail("Boutique non autorisée.", 403);
    }
    const existe = await prisma.boutique.findUnique({ where: { id } });
    if (!existe) return fail("Boutique introuvable.", 404);
    await prisma.boutique.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
