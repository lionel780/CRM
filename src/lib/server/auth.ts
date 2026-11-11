import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidat = scryptSync(pin, salt, 64);
  const attendu = Buffer.from(hash, "hex");
  if (candidat.length !== attendu.length) return false;
  return timingSafeEqual(candidat, attendu);
}

const UTILISATEURS_DEMO = [
  { identifiant: "admin", nom: "Administrateur", pin: "1234", role: "admin" as const, boutiqueId: null },
  { identifiant: "vendeur", nom: "Vendeur Akwa", pin: "1234", role: "vendeur" as const, boutiqueId: "bq-akwa" },
];

export async function seedUtilisateurs(prisma: PrismaClient): Promise<void> {
  for (const u of UTILISATEURS_DEMO) {
    const existe = await prisma.utilisateur.findUnique({ where: { identifiant: u.identifiant } });
    if (existe) continue;
    await prisma.utilisateur.create({
      data: {
        identifiant: u.identifiant,
        nom: u.nom,
        pin: hashPin(u.pin),
        role: u.role,
        boutiqueId: u.boutiqueId,
      },
    });
  }
}
