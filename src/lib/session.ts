const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const SESSION_COOKIE = "boutika_session";
const SESSION_TTL = 60 * 60 * 24 * 7;

function secret(): string {
  return process.env.AUTH_SECRET || "boutika-demo-secret-a-changer";
}

export type Role = "super_admin" | "gerant" | "vendeur";

export const ROLES: Role[] = ["super_admin", "gerant", "vendeur"];

export type SessionPayload = {
  sub: string;
  nom: string;
  identifiant: string;
  role: Role;
  boutiqueId?: string | null;
  exp: number;
};

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function signature(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

export async function createSession(payload: Omit<SessionPayload, "exp">): Promise<string> {
  const body: SessionPayload = { ...payload, exp: Date.now() + SESSION_TTL * 1000 };
  const encoded = toBase64Url(encoder.encode(JSON.stringify(body)));
  const sig = await signature(encoded);
  return `${encoded}.${sig}`;
}

export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  try {
    const attendu = await signature(encoded);
    if (attendu.length !== sig.length) return null;
    let diff = 0;
    for (let i = 0; i < attendu.length; i++) diff |= attendu.charCodeAt(i) ^ sig.charCodeAt(i);
    if (diff !== 0) return null;
    const payload = JSON.parse(decoder.decode(fromBase64Url(encoded))) as SessionPayload;
    if (!payload?.exp || payload.exp < Date.now()) return null;
    if (!ROLES.includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL,
};
