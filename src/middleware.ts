import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const ROUTES_VENDEUR = ["/ventes", "/api/ventes", "/api/bootstrap", "/api/clients", "/api/auth"];

function vendeurAutorise(pathname: string): boolean {
  return ROUTES_VENDEUR.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    if (!session) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = session.role === "vendeur" ? "/ventes" : "/";
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

  if (session.role === "vendeur" && !vendeurAutorise(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Accès réservé à l'administrateur." }, { status: 403 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/ventes";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
