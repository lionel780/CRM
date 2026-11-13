import { prisma } from "@/lib/server/prisma";
import { mapClient } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";
import { calculerDettes } from "@/lib/server/queries";
import { verifierAcces } from "@/lib/server/auth-guard";
import { boutiqueParDefaut, boutiquesAutorisees, peutAccederBoutique } from "@/lib/server/tenants";

export const runtime = "nodejs";

type Corps = {
  boutiqueId?: string;
  nom?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
};

export async function GET() {
  try {
    const acces = await verifierAcces(["super_admin", "gerant", "vendeur"]);
    if (acces.response) return acces.response;

    const boutiqueIds = await boutiquesAutorisees(acces.session);
    const where = boutiqueIds ? { boutiqueId: { in: boutiqueIds } } : {};

    const [clients, ventes, factures] = await Promise.all([
      prisma.client.findMany({ where, orderBy: { nom: "asc" } }),
      prisma.vente.findMany({
        where: { statut: "credit", clientId: { not: null }, ...(boutiqueIds ? { boutiqueId: { in: boutiqueIds } } : {}) },
        select: { clientId: true, total: true, statut: true },
      }),
      prisma.facture.findMany({
        where: {
          statut: { in: ["envoyee", "retard"] },
          clientId: { not: null },
          ...(boutiqueIds ? { boutiqueId: { in: boutiqueIds } } : {}),
        },
        select: { clientId: true, total: true, statut: true },
      }),
    ]);

    const dettes = calculerDettes(ventes, factures);
    return ok(clients.map((c) => mapClient(c, dettes.get(c.id) ?? 0)));
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}

export async function POST(req: Request) {
  try {
    const acces = await verifierAcces(["super_admin", "gerant", "vendeur"]);
    if (acces.response) return acces.response;
    const session = acces.session;

    const b = await lireJson<Corps>(req);
    const nom = b.nom?.trim();
    if (!nom) return fail("Le nom du client est obligatoire.");

    let boutiqueId: string | null = null;
    if (session.role === "vendeur") {
      boutiqueId = session.boutiqueId ?? null;
    } else if (b.boutiqueId) {
      if (!(await peutAccederBoutique(session, b.boutiqueId))) {
        return fail("Boutique non autorisée.", 403);
      }
      boutiqueId = b.boutiqueId;
    } else {
      boutiqueId = await boutiqueParDefaut(session);
    }

    const telephone = b.telephone?.trim() || null;
    if (telephone) {
      const existant = await prisma.client.findFirst({
        where: { telephone, ...(boutiqueId ? { boutiqueId } : {}) },
      });
      if (existant) return ok(mapClient(existant, 0));
    }

    const cree = await prisma.client.create({
      data: {
        nom,
        telephone,
        email: b.email?.trim() || null,
        adresse: b.adresse?.trim() || null,
        boutiqueId,
      },
    });
    return ok(mapClient(cree, 0), 201);
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
