import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { seedUtilisateurs, verifyPin } from "@/lib/server/auth";
import { SESSION_COOKIE, createSession, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { identifiant?: string; pin?: string } | null;
    const identifiant = body?.identifiant?.trim().toLowerCase();
    const pin = body?.pin?.trim();
    if (!identifiant || !pin) {
      return NextResponse.json({ error: "Identifiant et PIN requis." }, { status: 400 });
    }

    await seedUtilisateurs(prisma);

    const utilisateur = await prisma.utilisateur.findUnique({ where: { identifiant } });
    if (!utilisateur || !utilisateur.actif || !verifyPin(pin, utilisateur.pin)) {
      return NextResponse.json({ error: "Identifiant ou PIN incorrect." }, { status: 401 });
    }

    const role: "super_admin" | "gerant" | "vendeur" =
      utilisateur.role === "super_admin" ? "super_admin" : utilisateur.role === "gerant" ? "gerant" : "vendeur";
    const token = await createSession({
      sub: utilisateur.id,
      nom: utilisateur.nom,
      identifiant: utilisateur.identifiant,
      role,
      boutiqueId: utilisateur.boutiqueId,
    });

    const res = NextResponse.json({
      id: utilisateur.id,
      nom: utilisateur.nom,
      identifiant: utilisateur.identifiant,
      role,
      boutiqueId: utilisateur.boutiqueId ?? undefined,
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json({ error: "Erreur de connexion." }, { status: 500 });
  }
}
