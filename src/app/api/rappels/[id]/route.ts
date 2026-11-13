import { prisma } from "@/lib/server/prisma";
import { mapRappel } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";
import { verifierAcces } from "@/lib/server/auth-guard";
import { peutAccederBoutique } from "@/lib/server/tenants";

export const runtime = "nodejs";

type Corps = { statut?: string };

async function rappelAutorise(session: Parameters<typeof peutAccederBoutique>[0], id: string) {
  const existe = await prisma.rappel.findUnique({
    where: { id },
    include: { client: { select: { boutiqueId: true } } },
  });
  if (!existe) return { erreur: fail("Rappel introuvable.", 404) };
  if (existe.client.boutiqueId && !(await peutAccederBoutique(session, existe.client.boutiqueId))) {
    return { erreur: fail("Rappel non autorisé.", 403) };
  }
  return { rappel: existe };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["super_admin", "gerant"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    const b = await lireJson<Corps>(req);
    const verif = await rappelAutorise(acces.session, id);
    if (verif.erreur) return verif.erreur;
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
    const acces = await verifierAcces(["super_admin", "gerant"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    const verif = await rappelAutorise(acces.session, id);
    if (verif.erreur) return verif.erreur;
    await prisma.rappel.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
