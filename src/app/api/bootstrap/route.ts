import { chargerTout } from "@/lib/server/queries";
import { sessionCourante } from "@/lib/server/auth-guard";
import { fail, messageErreur } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await sessionCourante();
    if (!session) return fail("Authentification requise.", 401);

    const data = await chargerTout();
    const utilisateur = {
      id: session.sub,
      nom: session.nom,
      identifiant: session.identifiant,
      role: session.role,
      boutiqueId: session.boutiqueId ?? undefined,
    };

    if (session.role === "vendeur") {
      const boutiqueId = session.boutiqueId;
      return Response.json({
        ...data,
        boutiques: data.boutiques.filter((b) => !boutiqueId || b.id === boutiqueId),
        produits: data.produits.filter((p) => !boutiqueId || p.boutiqueId === boutiqueId),
        ventes: data.ventes.filter((v) => !boutiqueId || v.boutiqueId === boutiqueId),
        factures: [],
        devis: [],
        rappels: [],
        paiements: [],
        utilisateur,
      });
    }

    return Response.json({ ...data, utilisateur });
  } catch (e) {
    return fail(messageErreur(e), 500);
  }
}
