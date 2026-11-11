import { prisma } from "@/lib/server/prisma";
import { mapBoutique } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";

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
    const { id } = await params;
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
