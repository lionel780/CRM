import { prisma } from "@/lib/server/prisma";
import { mapUtilisateur } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";
import { verifierAcces } from "@/lib/server/auth-guard";
import { hashPin } from "@/lib/server/auth";
import { boutiquesAutorisees, peutAccederBoutique } from "@/lib/server/tenants";

export const runtime = "nodejs";

type Corps = {
  nom?: string;
  identifiant?: string;
  pin?: string;
  role?: string;
  boutiqueId?: string;
};

export async function GET() {
  try {
    const acces = await verifierAcces(["super_admin", "gerant"]);
    if (acces.response) return acces.response;
    const session = acces.session;

    let where = {};
    if (session.role === "gerant") {
      const ids = (await boutiquesAutorisees(session)) ?? [];
      where = { OR: [{ id: session.sub }, { boutiqueId: { in: ids } }] };
    }

    const [utilisateurs, boutiques] = await Promise.all([
      prisma.utilisateur.findMany({ where, orderBy: { createdAt: "asc" } }),
      prisma.boutique.findMany({ select: { id: true, nom: true } }),
    ]);
    const noms = new Map(boutiques.map((b) => [b.id, b.nom]));

    return ok(
      utilisateurs.map((u) => mapUtilisateur(u, u.boutiqueId ? noms.get(u.boutiqueId) : undefined)),
    );
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}

export async function POST(req: Request) {
  try {
    const acces = await verifierAcces(["super_admin", "gerant"]);
    if (acces.response) return acces.response;
    const session = acces.session;

    const b = await lireJson<Corps>(req);
    const nom = b.nom?.trim();
    const identifiant = b.identifiant?.trim().toLowerCase();
    const pin = b.pin?.trim();
    if (!nom) return fail("Le nom est obligatoire.");
    if (!identifiant) return fail("L'identifiant est obligatoire.");
    if (!pin || pin.length < 4) return fail("Le PIN doit contenir au moins 4 caractères.");

    const role = session.role === "gerant" ? "vendeur" : b.role?.trim() || "vendeur";
    if (role !== "gerant" && role !== "vendeur") return fail("Rôle invalide.");

    let boutiqueId = b.boutiqueId?.trim() || null;
    if (session.role === "gerant") {
      const ids = (await boutiquesAutorisees(session)) ?? [];
      if (!boutiqueId) boutiqueId = ids[0] ?? null;
      if (!boutiqueId || !(await peutAccederBoutique(session, boutiqueId))) {
        return fail("Boutique non autorisée.", 403);
      }
    } else if (boutiqueId && !(await peutAccederBoutique(session, boutiqueId))) {
      return fail("Boutique non autorisée.", 403);
    }
    if (role === "vendeur" && !boutiqueId) {
      return fail("Un vendeur doit être rattaché à une boutique.");
    }

    const existant = await prisma.utilisateur.findUnique({ where: { identifiant } });
    if (existant) return fail("Cet identifiant est déjà utilisé.", 409);

    const cree = await prisma.$transaction(async (tx) => {
      const u = await tx.utilisateur.create({
        data: { nom, identifiant, pin: hashPin(pin), role, boutiqueId },
      });
      if (role === "gerant" && boutiqueId) {
        await tx.boutique.update({ where: { id: boutiqueId }, data: { gerantId: u.id } });
      }
      return u;
    }, { timeout: 20000, maxWait: 10000 });

    const boutique = boutiqueId
      ? await prisma.boutique.findUnique({ where: { id: boutiqueId }, select: { nom: true } })
      : null;
    return ok(mapUtilisateur(cree, boutique?.nom), 201);
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
