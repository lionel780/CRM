import { sessionCourante } from "@/lib/server/auth-guard";

export const runtime = "nodejs";

export async function GET() {
  const session = await sessionCourante();
  if (!session) return Response.json({ error: "Non authentifié." }, { status: 401 });
  return Response.json({
    id: session.sub,
    nom: session.nom,
    identifiant: session.identifiant,
    role: session.role,
    boutiqueId: session.boutiqueId ?? undefined,
  });
}
