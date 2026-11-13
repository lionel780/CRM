import { prisma } from "@/lib/server/prisma";
import { mapBoutique } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";
import { verifierAcces } from "@/lib/server/auth-guard";

export const runtime = "nodejs";

type Corps = {
  nom?: string;
  ville?: string;
  adresse?: string;
  telephone?: string;
  gerantId?: string;
};

export async function POST(req: Request) {
  try {
    const acces = await verifierAcces(["super_admin", "gerant"]);
    if (acces.response) return acces.response;
    const session = acces.session;

    const b = await lireJson<Corps>(req);
    if (!b.nom?.trim()) return fail("Le nom de la boutique est obligatoire.");

    const gerantId = session.role === "gerant" ? session.sub : b.gerantId?.trim() || null;
    if (gerantId) {
      const gerant = await prisma.utilisateur.findUnique({ where: { id: gerantId } });
      if (!gerant || gerant.role !== "gerant") return fail("Gérant introuvable.", 404);
    }

    const cree = await prisma.boutique.create({
      data: {
        nom: b.nom.trim(),
        ville: b.ville?.trim() || "Douala",
        adresse: b.adresse?.trim() || "—",
        telephone: b.telephone?.trim() || "—",
        gerantId,
      },
    });
    return ok(mapBoutique(cree), 201);
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
