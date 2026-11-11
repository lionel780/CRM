import { prisma } from "@/lib/server/prisma";
import { mapBoutique } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";

export const runtime = "nodejs";

type Corps = {
  nom?: string;
  ville?: string;
  adresse?: string;
  telephone?: string;
};

export async function POST(req: Request) {
  try {
    const b = await lireJson<Corps>(req);
    if (!b.nom?.trim()) return fail("Le nom de la boutique est obligatoire.");
    const cree = await prisma.boutique.create({
      data: {
        nom: b.nom.trim(),
        ville: b.ville?.trim() || "Douala",
        adresse: b.adresse?.trim() || "—",
        telephone: b.telephone?.trim() || "—",
      },
    });
    return ok(mapBoutique(cree), 201);
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
