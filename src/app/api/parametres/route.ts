import { prisma } from "@/lib/server/prisma";
import { mapParametres } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";
import { verifierAcces } from "@/lib/server/auth-guard";

export const runtime = "nodejs";

type Corps = {
  entreprise?: string;
  ville?: string;
  telephone?: string;
  tva?: number;
  operateurs?: { mtn?: boolean; orange?: boolean };
  logo?: string | null;
  rappelAuto?: boolean;
  rappelJours?: number;
  whatsappModele?: string;
};

export async function PUT(req: Request) {
  try {
    const acces = await verifierAcces(["super_admin"]);
    if (acces.response) return acces.response;

    const b = await lireJson<Corps>(req);
    const actuel = await prisma.parametres.findUnique({ where: { id: 1 } });

    const data = {
      entreprise: b.entreprise?.trim() ?? actuel?.entreprise ?? "Mon entreprise",
      ville: b.ville?.trim() ?? actuel?.ville ?? "Douala",
      telephone: b.telephone?.trim() ?? actuel?.telephone ?? "+237 6 00 00 00 00",
      tva: typeof b.tva === "number" && b.tva >= 0 ? b.tva : actuel?.tva ?? 19.25,
      mtn: b.operateurs?.mtn ?? actuel?.mtn ?? true,
      orange: b.operateurs?.orange ?? actuel?.orange ?? true,
      logo: b.logo !== undefined ? b.logo || null : actuel?.logo ?? null,
      rappelAuto: b.rappelAuto ?? actuel?.rappelAuto ?? true,
      rappelJours:
        typeof b.rappelJours === "number" && b.rappelJours >= 1
          ? Math.round(b.rappelJours)
          : actuel?.rappelJours ?? 7,
      whatsappModele:
        b.whatsappModele !== undefined ? b.whatsappModele.trim() || null : actuel?.whatsappModele ?? null,
    };

    const maj = await prisma.parametres.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });

    return ok(mapParametres(maj));
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
