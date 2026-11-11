import { prisma } from "@/lib/server/prisma";
import { mapRappel } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";
import { calculerDettes, genererRappelsAuto } from "@/lib/server/queries";
import { verifierAcces } from "@/lib/server/auth-guard";

export const runtime = "nodejs";

type Corps = { clientId?: string; montant?: number; message?: string };

export async function GET() {
  try {
    const acces = await verifierAcces(["admin"]);
    if (acces.response) return acces.response;

    const rappels = await prisma.rappel.findMany({ orderBy: { date: "desc" } });
    return ok(rappels.map(mapRappel));
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}

export async function POST(req: Request) {
  try {
    const acces = await verifierAcces(["admin"]);
    if (acces.response) return acces.response;

    const b = await lireJson<Corps>(req);
    if (!b.clientId) return fail("Sélectionnez un client.");

    const client = await prisma.client.findUnique({ where: { id: b.clientId } });
    if (!client) return fail("Client introuvable.", 404);

    const [ventes, factures, parametres] = await Promise.all([
      prisma.vente.findMany({
        where: { statut: "credit", clientId: client.id },
        select: { clientId: true, total: true, statut: true },
      }),
      prisma.facture.findMany({
        where: { statut: { in: ["envoyee", "retard"] }, clientId: client.id },
        select: { clientId: true, total: true, statut: true },
      }),
      prisma.parametres.findUnique({ where: { id: 1 } }),
    ]);

    const dette = calculerDettes(ventes, factures).get(client.id) ?? 0;
    const montant = typeof b.montant === "number" && b.montant >= 0 ? Math.round(b.montant) : dette;
    const modele =
      parametres?.whatsappModele ||
      "Bonjour {client}, votre solde chez {entreprise} est de {montant} FCFA. Merci de régulariser votre situation.";
    const message =
      b.message?.trim() ||
      modele
        .replaceAll("{client}", client.nom)
        .replaceAll("{entreprise}", parametres?.entreprise ?? "nous")
        .replaceAll("{montant}", new Intl.NumberFormat("fr-FR").format(montant));

    const cree = await prisma.rappel.create({
      data: {
        clientId: client.id,
        type: "manuel",
        canal: "whatsapp",
        message,
        montant,
        statut: "en_attente",
      },
    });
    return ok(mapRappel(cree), 201);
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}

export async function PUT() {
  try {
    const acces = await verifierAcces(["admin"]);
    if (acces.response) return acces.response;

    const parametres = await prisma.parametres.findUnique({ where: { id: 1 } });
    if (!parametres) return fail("Paramètres introuvables.", 404);
    await genererRappelsAuto(prisma, parametres);

    const rappels = await prisma.rappel.findMany({ orderBy: { date: "desc" } });
    return ok(rappels.map(mapRappel));
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
