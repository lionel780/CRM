import { chargerTout } from "@/lib/server/queries";
import { sessionCourante } from "@/lib/server/auth-guard";
import { fail, messageErreur } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await sessionCourante();
    if (!session) return fail("Authentification requise.", 401);

    const data = await chargerTout(session);
    const utilisateur = data.utilisateurs.find((u) => u.id === session.sub) ?? {
      id: session.sub,
      nom: session.nom,
      identifiant: session.identifiant,
      role: session.role,
      boutiqueId: session.boutiqueId ?? undefined,
      actif: true,
      createdAt: new Date().toISOString(),
    };

    if (session.role === "vendeur") {
      return Response.json({
        ...data,
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
