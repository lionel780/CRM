export function ok(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function messageErreur(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Erreur inconnue";
}

export async function lireJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Corps de requête JSON invalide");
  }
}

export function nouveauReference(prefix = "PAY"): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}
