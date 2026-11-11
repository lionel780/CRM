import type { PrismaClient } from "@prisma/client";

export type ClientResolu = { id: string; nom: string; telephone?: string | null };

export async function resoudreClient(
  prisma: PrismaClient,
  clientId?: string | null,
  clientNom?: string | null,
  clientTel?: string | null,
): Promise<ClientResolu | null> {
  if (clientId) {
    const existant = await prisma.client.findUnique({ where: { id: clientId } });
    if (existant) {
      return { id: existant.id, nom: existant.nom, telephone: existant.telephone };
    }
  }

  const tel = clientTel?.trim() || null;
  const nom = clientNom?.trim() || null;

  if (tel) {
    const parTel = await prisma.client.findFirst({ where: { telephone: tel } });
    if (parTel) return { id: parTel.id, nom: parTel.nom, telephone: parTel.telephone };
  }

  if (!nom) return null;

  const cree = await prisma.client.create({
    data: { nom, telephone: tel },
  });
  return { id: cree.id, nom: cree.nom, telephone: cree.telephone };
}
