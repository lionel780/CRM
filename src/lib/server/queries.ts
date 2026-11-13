import type { Parametres as PParametres, PrismaClient } from "@prisma/client";
import type { SessionPayload } from "../session";
import { prisma } from "./prisma";
import { seedDatabase } from "./seed-db";
import { boutiquesAutorisees } from "./tenants";
import {
  mapBoutique,
  mapClient,
  mapDevis,
  mapFacture,
  mapPaiement,
  mapParametres,
  mapProduit,
  mapRappel,
  mapUtilisateur,
  mapVente,
} from "./dto";

export function calculerDettes(
  ventes: { clientId: string | null; total: number; statut: string }[],
  factures: { clientId: string | null; total: number; statut: string }[],
): Map<string, number> {
  const dettes = new Map<string, number>();
  for (const v of ventes) {
    if (v.statut !== "credit" || !v.clientId) continue;
    dettes.set(v.clientId, (dettes.get(v.clientId) ?? 0) + v.total);
  }
  for (const f of factures) {
    if (f.statut === "payee" || f.statut === "brouillon" || !f.clientId) continue;
    dettes.set(f.clientId, (dettes.get(f.clientId) ?? 0) + f.total);
  }
  return dettes;
}

export async function genererRappelsAuto(
  prismaClient: PrismaClient,
  p: PParametres,
  boutiqueIds?: string[] | null,
): Promise<void> {
  if (!p.rappelAuto) return;
  if (boutiqueIds && boutiqueIds.length === 0) return;
  const jours = Math.max(1, p.rappelJours || 7);
  const seuil = new Date(Date.now() - jours * 86_400_000);
  const whereBoutique = boutiqueIds ? { boutiqueId: { in: boutiqueIds } } : {};

  const [clients, ventes, factures] = await Promise.all([
    prismaClient.client.findMany({ where: whereBoutique }),
    prismaClient.vente.findMany({
      where: { ...whereBoutique, statut: "credit", clientId: { not: null } },
      select: { clientId: true, total: true, statut: true },
    }),
    prismaClient.facture.findMany({
      where: { ...whereBoutique, statut: { in: ["envoyee", "retard"] }, clientId: { not: null } },
      select: { clientId: true, total: true, statut: true },
    }),
  ]);

  const dettes = calculerDettes(ventes, factures);
  const modele =
    p.whatsappModele ||
    "Bonjour {client}, votre solde chez {entreprise} est de {montant} FCFA. Merci de régulariser votre situation.";

  for (const client of clients) {
    const montant = dettes.get(client.id) ?? 0;
    if (montant <= 0 || !client.telephone) continue;

    const dernier = await prismaClient.rappel.findFirst({
      where: { clientId: client.id },
      orderBy: { date: "desc" },
    });
    if (dernier && dernier.date > seuil) continue;

    const message = modele
      .replaceAll("{client}", client.nom)
      .replaceAll("{entreprise}", p.entreprise)
      .replaceAll("{montant}", new Intl.NumberFormat("fr-FR").format(Math.round(montant)));

    await prismaClient.rappel.create({
      data: {
        clientId: client.id,
        type: "auto",
        canal: "whatsapp",
        message,
        montant,
        statut: "en_attente",
      },
    });
  }
}

export async function chargerTout(session: SessionPayload | null) {
  await seedDatabase(prisma);

  const boutiqueIds = await boutiquesAutorisees(session);
  const whereBoutique = boutiqueIds ? { boutiqueId: { in: boutiqueIds } } : {};

  const parametres = await prisma.parametres.findUnique({ where: { id: 1 } });
  if (parametres && session && session.role !== "vendeur") {
    try {
      await genererRappelsAuto(prisma, parametres, boutiqueIds);
    } catch {
      // le rappel automatique ne doit jamais bloquer le chargement
    }
  }

  if (boutiqueIds && boutiqueIds.length === 0) {
    return {
      boutiques: [],
      produits: [],
      ventes: [],
      factures: [],
      devis: [],
      clients: [],
      rappels: [],
      paiements: [],
      parametres: mapParametres(parametres),
      utilisateurs: [],
    };
  }

  const [boutiques, produits, ventes, factures, devis, clients, rappels, paiements, parametresFinal] =
    await Promise.all([
      prisma.boutique.findMany({
        where: boutiqueIds ? { id: { in: boutiqueIds } } : {},
        orderBy: { createdAt: "asc" },
      }),
      prisma.produit.findMany({ where: whereBoutique, orderBy: { createdAt: "asc" } }),
      prisma.vente.findMany({ where: whereBoutique, include: { lignes: true }, orderBy: { date: "asc" } }),
      prisma.facture.findMany({ where: whereBoutique, include: { lignes: true }, orderBy: { date: "desc" } }),
      prisma.devis.findMany({ where: whereBoutique, include: { lignes: true }, orderBy: { date: "desc" } }),
      prisma.client.findMany({ where: whereBoutique, orderBy: { nom: "asc" } }),
      prisma.rappel.findMany({
        where: boutiqueIds ? { client: { boutiqueId: { in: boutiqueIds } } } : {},
        orderBy: { date: "desc" },
      }),
      prisma.paiement.findMany({
        where: boutiqueIds
          ? {
              OR: [
                { vente: { boutiqueId: { in: boutiqueIds } } },
                { facture: { boutiqueId: { in: boutiqueIds } } },
              ],
            }
          : {},
        orderBy: { date: "desc" },
      }),
      prisma.parametres.findUnique({ where: { id: 1 } }),
    ]);

  const utilisateurs = await prisma.utilisateur.findMany({
    where:
      session?.role === "super_admin"
        ? {}
        : session?.role === "gerant"
          ? { OR: [{ id: session.sub }, { boutiqueId: { in: boutiqueIds ?? [] } }] }
          : { id: session?.sub ?? "" },
    orderBy: { createdAt: "asc" },
  });

  const dettes = calculerDettes(ventes, factures);
  const nomsBoutiques = new Map(boutiques.map((b) => [b.id, b.nom]));
  const nomsUtilisateurs = new Map(utilisateurs.map((u) => [u.id, u.nom]));

  return {
    boutiques: boutiques.map((b) => mapBoutique(b, b.gerantId ? nomsUtilisateurs.get(b.gerantId) : undefined)),
    produits: produits.map(mapProduit),
    ventes: ventes.map(mapVente),
    factures: factures.map(mapFacture),
    devis: devis.map(mapDevis),
    clients: clients.map((c) => mapClient(c, dettes.get(c.id) ?? 0)),
    rappels: rappels.map(mapRappel),
    paiements: paiements.map(mapPaiement),
    parametres: mapParametres(parametresFinal),
    utilisateurs: utilisateurs.map((u) =>
      mapUtilisateur(u, u.boutiqueId ? nomsBoutiques.get(u.boutiqueId) : undefined),
    ),
  };
}

export async function prochainNumeroVente(): Promise<string> {
  const year = new Date().getFullYear();
  const n = await prisma.vente.count();
  return `V-${year}-${String(n + 1).padStart(4, "0")}`;
}

export async function prochainNumeroFacture(): Promise<string> {
  const year = new Date().getFullYear();
  const n = await prisma.facture.count();
  return `F-${year}-${String(n + 1).padStart(4, "0")}`;
}

export async function prochainNumeroDevis(): Promise<string> {
  const year = new Date().getFullYear();
  const n = await prisma.devis.count();
  return `D-${year}-${String(n + 1).padStart(4, "0")}`;
}

export function operateurDeMode(mode: string): "mtn_momo" | "orange_money" | "espece" {
  if (mode === "mtn_momo") return "mtn_momo";
  if (mode === "orange_money") return "orange_money";
  return "espece";
}

export function libelleMode(mode: string): string {
  if (mode === "mtn_momo") return "MTN Mobile Money";
  if (mode === "orange_money") return "Orange Money";
  if (mode === "credit") return "Credit";
  return "Especes";
}
