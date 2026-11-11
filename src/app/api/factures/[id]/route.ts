import { prisma } from "@/lib/server/prisma";
import { fail, messageErreur, ok } from "@/lib/server/http";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existe = await prisma.facture.findUnique({ where: { id } });
    if (!existe) return fail("Facture introuvable.", 404);
    await prisma.facture.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
