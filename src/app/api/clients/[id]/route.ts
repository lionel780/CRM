import { prisma } from "@/lib/server/prisma";
import { mapClient } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";
import { calculerDettes } from "@/lib/server/queries";
import { verifierAcces } from "@/lib/server/auth-guard";

export const runtime = "nodejs";

type Corps = {
  nom?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["admin"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    const b = await lireJson<Corps>(req);
    const existe = await prisma.client.findUnique({ where: { id } });
    if (!existe) return fail("Client introuvable.", 404);

    const maj = await prisma.client.update({
      where: { id },
      data: {
        nom: b.nom?.trim() || undefined,
        telephone: b.telephone !== undefined ? b.telephone.trim() || null : undefined,
        email: b.email !== undefined ? b.email.trim() || null : undefined,
        adresse: b.adresse !== undefined ? b.adresse.trim() || null : undefined,
      },
    });

    const [ventes, factures] = await Promise.all([
      prisma.vente.findMany({
        where: { statut: "credit", clientId: id },
        select: { clientId: true, total: true, statut: true },
      }),
      prisma.facture.findMany({
        where: { statut: { in: ["envoyee", "retard"] }, clientId: id },
        select: { clientId: true, total: true, statut: true },
      }),
    ]);
    const dette = calculerDettes(ventes, factures).get(id) ?? 0;

    return ok(mapClient(maj, dette));
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["admin"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    const existe = await prisma.client.findUnique({ where: { id } });
    if (!existe) return fail("Client introuvable.", 404);
    await prisma.client.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
