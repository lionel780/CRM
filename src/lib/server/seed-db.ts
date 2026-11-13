import type { PrismaClient } from "@prisma/client";
import { seedUtilisateurs } from "./auth";

export async function seedDatabase(prisma: PrismaClient): Promise<boolean> {
  await seedUtilisateurs(prisma);
  return false;
}
