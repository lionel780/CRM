import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const ROUTES_VENDEUR = [
  "/ventes",
  "/stock",
  "/api/ventes",
  "/api/produits",
  "/api/clients",
  "/api/bootstrap",
  "/api/auth",
];

const ROUTES_SUPER_ADMIN = ["/parametres", "/api/parametres"];

function prefixeAutorise(pathname: string, routes: string[]): boolean {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function accueil(role: string): string {
  return role === "vendeur" ? "/ventes" : "/";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login" || pathname === "/inscription") {
    if (!session) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = accueil(session.role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (session.role === "vendeur" && !prefixeAutorise(pathname, ROUTES_VENDEUR)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Accès non autorisé pour votre rôle." }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/ventes";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (session.role !== "super_admin" && prefixeAutorise(pathname, ROUTES_SUPER_ADMIN)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Accès réservé au super administrateur." }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = accueil(session.role);
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
