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

const SUPER_ADMIN = {
  identifiant: (process.env.SUPER_ADMIN_IDENTIFIANT || "admin").trim().toLowerCase(),
  nom: "Super administrateur",
  pin: process.env.SUPER_ADMIN_PIN || "1234",
  role: "super_admin",
};

export async function seedUtilisateurs(prisma: PrismaClient): Promise<void> {
  const existe = await prisma.utilisateur.findUnique({ where: { identifiant: SUPER_ADMIN.identifiant } });
  if (existe) {
    if (existe.role !== SUPER_ADMIN.role) {
      await prisma.utilisateur.update({ where: { id: existe.id }, data: { role: SUPER_ADMIN.role } });
    }
    return;
  }
  await prisma.utilisateur.create({
    data: {
      identifiant: SUPER_ADMIN.identifiant,
      nom: SUPER_ADMIN.nom,
      pin: hashPin(SUPER_ADMIN.pin),
      role: SUPER_ADMIN.role,
    },
  });
}
