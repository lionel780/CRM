import { prisma } from "@/lib/server/prisma";
import { chargerTout } from "@/lib/server/queries";
import { fail, messageErreur } from "@/lib/server/http";
import { verifierAcces } from "@/lib/server/auth-guard";

export const runtime = "nodejs";

export async function POST() {
  try {
    const acces = await verifierAcces(["super_admin"]);
    if (acces.response) return acces.response;

    await prisma.$transaction(async (tx) => {
      await tx.paiement.deleteMany();
      await tx.factureLigne.deleteMany();
      await tx.facture.deleteMany();
      await tx.devisLigne.deleteMany();
      await tx.devis.deleteMany();
      await tx.rappel.deleteMany();
      await tx.venteLigne.deleteMany();
      await tx.vente.deleteMany();
      await tx.produit.deleteMany();
      await tx.client.deleteMany();
      await tx.boutique.deleteMany();
      await tx.utilisateur.deleteMany({ where: { role: { not: "super_admin" } } });
      await tx.parametres.deleteMany();
    }, { timeout: 20000, maxWait: 10000 });

    const data = await chargerTout(acces.session);
    return Response.json(data);
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
