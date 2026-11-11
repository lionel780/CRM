import { prisma } from "@/lib/server/prisma";
import { mapRappel } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";
import { verifierAcces } from "@/lib/server/auth-guard";

export const runtime = "nodejs";

type Corps = { statut?: string };

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["admin"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    const b = await lireJson<Corps>(req);
    const existe = await prisma.rappel.findUnique({ where: { id } });
    if (!existe) return fail("Rappel introuvable.", 404);
    if (b.statut !== "envoye" && b.statut !== "en_attente") return fail("Statut invalide.");

    const maj = await prisma.rappel.update({
      where: { id },
      data: {
        statut: b.statut,
        envoyeLe: b.statut === "envoye" ? new Date() : null,
      },
    });
    return ok(mapRappel(maj));
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["admin"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    const existe = await prisma.rappel.findUnique({ where: { id } });
    if (!existe) return fail("Rappel introuvable.", 404);
    await prisma.rappel.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
