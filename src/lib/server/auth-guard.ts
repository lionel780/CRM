import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type Role, type SessionPayload } from "../session";

export async function sessionCourante(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export type Acces = { session: SessionPayload; response?: never } | { session?: never; response: Response };

export async function verifierAcces(roles: Role[]): Promise<Acces> {
  const session = await sessionCourante();
  if (!session) {
    return {
      response: Response.json({ error: "Authentification requise." }, { status: 401 }),
    };
  }
  if (!roles.includes(session.role)) {
    return {
      response: Response.json({ error: "Accès réservé à l'administrateur." }, { status: 403 }),
    };
  }
  return { session };
}
