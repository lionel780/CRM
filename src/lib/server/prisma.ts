import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function urlAvecLimites(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) return url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("connection_limit")) u.searchParams.set("connection_limit", "1");
    if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "20");
    if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "10");
    return u.toString();
  } catch {
    return url;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasourceUrl: urlAvecLimites(process.env.DATABASE_URL),
  });

globalForPrisma.prisma = prisma;
