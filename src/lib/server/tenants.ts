import type { SessionPayload } from "../session";
import { prisma } from "./prisma";

/**
 * Retourne les identifiants de boutiques auxquels la session a accès.
 * `null` signifie un accès global (super administrateur).
 */
export async function boutiquesAutorisees(session: SessionPayload | null): Promise<string[] | null> {
  if (!session) return [];
  if (session.role === "super_admin") return null;

  if (session.role === "vendeur") {
    return session.boutiqueId ? [session.boutiqueId] : [];
  }

  const conditions: { gerantId?: string; id?: string }[] = [{ gerantId: session.sub }];
  if (session.boutiqueId) conditions.push({ id: session.boutiqueId });

  const boutiques = await prisma.boutique.findMany({
    where: { OR: conditions },
    select: { id: true },
  });
  return boutiques.map((b) => b.id);
}

export async function peutAccederBoutique(
  session: SessionPayload | null,
  boutiqueId: string,
): Promise<boolean> {
  if (!session) return false;
  if (session.role === "super_admin") return true;
  if (session.role === "vendeur") return session.boutiqueId === boutiqueId;

  const boutique = await prisma.boutique.findFirst({
    where: { id: boutiqueId, gerantId: session.sub },
    select: { id: true },
  });
  return Boolean(boutique) || session.boutiqueId === boutiqueId;
}

export async function boutiqueParDefaut(session: SessionPayload | null): Promise<string | null> {
  if (!session) return null;
  if (session.role === "vendeur") return session.boutiqueId ?? null;
  const ids = await boutiquesAutorisees(session);
  if (ids && ids.length > 0) return ids[0];
  if (session.boutiqueId) return session.boutiqueId;
  return null;
}

export async function gerantPossedeBoutique(gerantId: string, boutiqueId: string): Promise<boolean> {
  const b = await prisma.boutique.findFirst({
    where: { id: boutiqueId, gerantId },
    select: { id: true },
  });
  return Boolean(b);
}
