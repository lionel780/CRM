import { prisma } from "@/lib/server/prisma";
import { mapUtilisateur } from "@/lib/server/dto";
import { fail, lireJson, messageErreur, ok } from "@/lib/server/http";
import { verifierAcces } from "@/lib/server/auth-guard";
import { hashPin } from "@/lib/server/auth";
import { peutAccederBoutique } from "@/lib/server/tenants";
import type { SessionPayload } from "@/lib/session";

export const runtime = "nodejs";

type Corps = {
  nom?: string;
  pin?: string;
  actif?: boolean;
  role?: string;
  boutiqueId?: string | null;
};

async function cibleAutorisee(session: SessionPayload, id: string) {
  const cible = await prisma.utilisateur.findUnique({ where: { id } });
  if (!cible) return { erreur: fail("Utilisateur introuvable.", 404) };
  if (cible.role === "super_admin" && session.sub !== cible.id) {
    return { erreur: fail("Le super administrateur est protégé.", 403) };
  }

  if (session.role === "gerant" && session.sub !== cible.id) {
    if (cible.role !== "vendeur") return { erreur: fail("Action non autorisée.", 403) };
    if (!cible.boutiqueId || !(await peutAccederBoutique(session, cible.boutiqueId))) {
      return { erreur: fail("Utilisateur non autorisé.", 403) };
    }
  }
  return { cible };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["super_admin", "gerant"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    const b = await lireJson<Corps>(req);
    const verif = await cibleAutorisee(acces.session, id);
    if (verif.erreur) return verif.erreur;
    const cible = verif.cible;

    const estSoiMeme = acces.session.sub === id;

    const data: Record<string, unknown> = {};
    if (b.nom?.trim()) data.nom = b.nom.trim();
    if (b.pin?.trim()) {
      if (b.pin.trim().length < 4) return fail("Le PIN doit contenir au moins 4 caractères.");
      data.pin = hashPin(b.pin.trim());
    }
    if (estSoiMeme) {
      const maj = await prisma.utilisateur.update({ where: { id }, data });
      return ok(mapUtilisateur(maj, undefined));
    }

    if (typeof b.actif === "boolean") data.actif = b.actif;

    if (acces.session.role === "super_admin") {
      if (b.role !== undefined) {
        if (b.role !== "gerant" && b.role !== "vendeur") return fail("Rôle invalide.");
        data.role = b.role;
      }
      if (b.boutiqueId !== undefined) {
        if (b.boutiqueId && !(await peutAccederBoutique(acces.session, b.boutiqueId))) {
          return fail("Boutique non autorisée.", 403);
        }
        data.boutiqueId = b.boutiqueId || null;
      }
    } else if (b.boutiqueId !== undefined && b.boutiqueId !== cible.boutiqueId) {
      return fail("Action non autorisée.", 403);
    }

    const maj = await prisma.utilisateur.update({ where: { id }, data });
    const boutique = maj.boutiqueId
      ? await prisma.boutique.findUnique({ where: { id: maj.boutiqueId }, select: { nom: true } })
      : null;
    return ok(mapUtilisateur(maj, boutique?.nom));
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const acces = await verifierAcces(["super_admin", "gerant"]);
    if (acces.response) return acces.response;

    const { id } = await params;
    if (id === acces.session.sub) return fail("Vous ne pouvez pas supprimer votre propre compte.", 400);
    const verif = await cibleAutorisee(acces.session, id);
    if (verif.erreur) return verif.erreur;

    await prisma.utilisateur.delete({ where: { id } });
    return ok({ ok: true });
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
