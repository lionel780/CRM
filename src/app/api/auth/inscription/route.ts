import { NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { hashPin, seedUtilisateurs } from "@/lib/server/auth";
import { SESSION_COOKIE, createSession, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

type Corps = {
  nom?: string;
  identifiant?: string;
  pin?: string;
  boutiqueNom?: string;
  ville?: string;
  adresse?: string;
  telephone?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as Corps | null;
    const nom = body?.nom?.trim();
    const identifiant = body?.identifiant?.trim().toLowerCase();
    const pin = body?.pin?.trim();
    const boutiqueNom = body?.boutiqueNom?.trim();

    if (!nom) return NextResponse.json({ error: "Votre nom est obligatoire." }, { status: 400 });
    if (!identifiant) return NextResponse.json({ error: "L'identifiant est obligatoire." }, { status: 400 });
    if (!pin || pin.length < 4) {
      return NextResponse.json({ error: "Le PIN doit contenir au moins 4 caractères." }, { status: 400 });
    }
    if (!boutiqueNom) {
      return NextResponse.json({ error: "Le nom de la boutique est obligatoire." }, { status: 400 });
    }

    await seedUtilisateurs(prisma);

    const existant = await prisma.utilisateur.findUnique({ where: { identifiant } });
    if (existant) {
      return NextResponse.json({ error: "Cet identifiant est déjà utilisé." }, { status: 409 });
    }

    const { utilisateur, boutique } = await prisma.$transaction(async (tx) => {
      const u = await tx.utilisateur.create({
        data: {
          nom,
          identifiant,
          pin: hashPin(pin),
          role: "gerant",
        },
      });
      const b = await tx.boutique.create({
        data: {
          nom: boutiqueNom,
          ville: body?.ville?.trim() || "Douala",
          adresse: body?.adresse?.trim() || "—",
          telephone: body?.telephone?.trim() || "—",
          gerantId: u.id,
        },
      });
      const maj = await tx.utilisateur.update({
        where: { id: u.id },
        data: { boutiqueId: b.id },
      });
      return { utilisateur: maj, boutique: b };
    }, { timeout: 20000, maxWait: 10000 });

    const token = await createSession({
      sub: utilisateur.id,
      nom: utilisateur.nom,
      identifiant: utilisateur.identifiant,
      role: "gerant",
      boutiqueId: boutique.id,
    });

    const res = NextResponse.json({
      id: utilisateur.id,
      nom: utilisateur.nom,
      identifiant: utilisateur.identifiant,
      role: "gerant",
      boutiqueId: boutique.id,
      boutiqueNom: boutique.nom,
    });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return res;
  } catch (error) {
    console.error("[auth/inscription]", error);
    return NextResponse.json({ error: "Inscription impossible." }, { status: 500 });
  }
}
