"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { formatDate } from "@/lib/format";
import { Icon, type IconName } from "./icons";

const NAV: { href: string; label: string; icon: IconName; adminSeulement?: boolean }[] = [
  { href: "/", label: "Tableau de bord", icon: "dashboard", adminSeulement: true },
  { href: "/ventes", label: "Caisse / Ventes", icon: "cart" },
  { href: "/stock", label: "Stock", icon: "box", adminSeulement: true },
  { href: "/factures", label: "Factures", icon: "file", adminSeulement: true },
  { href: "/devis", label: "Devis", icon: "file", adminSeulement: true },
  { href: "/clients", label: "Clients", icon: "user", adminSeulement: true },
  { href: "/rappels", label: "Rappels", icon: "bell", adminSeulement: true },
  { href: "/paiements", label: "Paiements", icon: "wallet", adminSeulement: true },
  { href: "/rapports", label: "Rapports", icon: "trendUp", adminSeulement: true },
  { href: "/boutiques", label: "Boutiques", icon: "store", adminSeulement: true },
  { href: "/parametres", label: "Paramètres", icon: "settings", adminSeulement: true },
];

const TITRES: Record<string, string> = {
  "/": "Tableau de bord",
  "/ventes": "Caisse / Ventes",
  "/stock": "Gestion du stock",
  "/factures": "Factures",
  "/devis": "Devis",
  "/clients": "Clients & dettes",
  "/rappels": "Rappels WhatsApp",
  "/paiements": "Paiements Mobile Money",
  "/rapports": "Rapports & analyses",
  "/boutiques": "Mes boutiques",
  "/parametres": "Paramètres",
};

function BoutiqueSelect() {
  const { state, setBoutiqueActive } = useApp();
  return (
    <div className="relative">
      <Icon name="store" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <select
        value={state.boutiqueActiveId}
        onChange={(e) => setBoutiqueActive(e.target.value)}
        aria-label="Boutique active"
        className="w-[170px] appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-8 pr-8 text-xs font-semibold text-neutral-700 outline-none transition hover:border-neutral-300 focus:border-emerald-500 sm:w-[210px]"
      >
        <option value="all">Toutes les boutiques</option>
        {state.boutiques.map((b) => (
          <option key={b.id} value={b.id}>
            {b.nom}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { state, deconnexion } = useApp();
  const role = state.utilisateur?.role ?? "admin";
  const nav = NAV.filter((item) => !item.adminSeulement || role === "admin");

  const alertesStock = useMemo(
    () => state.produits.filter((p) => p.stock <= p.seuil).length,
    [state.produits],
  );
  const facturesRetard = useMemo(
    () => state.factures.filter((f) => f.statut === "retard").length,
    [state.factures],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
          <Icon name="spark" className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold tracking-tight text-white">Boutika</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-400/80">Gestion PME CEMAC</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 overflow-y-auto px-3">
        {nav.map((item) => {
          const active = pathname === item.href;
          const badge =
            item.href === "/stock" ? alertesStock : item.href === "/factures" ? facturesRetard : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-emerald-500/15 text-white"
                  : "text-neutral-400 hover:bg-white/5 hover:text-neutral-100"
              }`}
            >
              <Icon
                name={item.icon}
                className={`h-[18px] w-[18px] ${active ? "text-emerald-400" : "text-neutral-500 group-hover:text-neutral-300"}`}
              />
              <span className="flex-1">{item.label}</span>
              {badge > 0 ? (
                <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                  {badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 p-3">
        {role === "admin" ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
            <div className="flex items-center gap-2 text-emerald-400">
              <Icon name="alert" className="h-4 w-4" />
              <span className="text-xs font-semibold">
                {alertesStock > 0 ? `${alertesStock} produit(s) en alerte` : "Stock à jour"}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">
              {alertesStock > 0
                ? "Réapprovisionnez vos boutiques pour éviter les ruptures."
                : "Tous vos seuils de stock sont respectés. Bon travail."}
            </p>
            <Link
              href="/stock"
              onClick={onNavigate}
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Voir le stock <Icon name="arrowRight" className="h-3 w-3" />
            </Link>
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
              {(state.utilisateur?.nom ?? "??").slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{state.utilisateur?.nom ?? "Utilisateur"}</p>
              <p className="text-[10px] uppercase tracking-wide text-emerald-400/80">
                {role === "admin" ? "Administrateur" : "Vendeur"}
              </p>
            </div>
            <button
              onClick={deconnexion}
              className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const titre = TITRES[pathname] ?? "Boutika";
  const boutiqueLabel =
    state.boutiqueActiveId === "all"
      ? `${state.boutiques.filter((b) => b.actif).length} boutiques`
      : state.boutiques.find((b) => b.id === state.boutiqueActiveId)?.nom ?? "";

  return (
    <div className="min-h-screen bg-[#f5f6f3] text-neutral-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] bg-[#0d1713] lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-neutral-900/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-[260px] bg-[#0d1713] shadow-2xl">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-neutral-200/70 bg-[#f5f6f3]/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-200/60 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-neutral-900">{titre}</p>
              <p suppressHydrationWarning className="hidden truncate text-xs text-neutral-500 sm:block">
                {formatDate(new Date().toISOString())} · {boutiqueLabel}
              </p>
            </div>

            <div className="hidden sm:block">
              <BoutiqueSelect />
            </div>

            <Link
              href="/ventes"
              className="hidden items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:inline-flex"
            >
              <Icon name="plus" className="h-4 w-4" /> Nouvelle vente
            </Link>

            <button className="relative rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-200/60" aria-label="Notifications">
              <Icon name="bell" className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
            </button>

            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white"
              title={state.utilisateur?.nom ?? "Utilisateur"}
            >
              {(state.utilisateur?.nom ?? "??").slice(0, 2).toUpperCase()}
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-neutral-200/60 px-4 py-2 sm:hidden">
            <BoutiqueSelect />
            <Link
              href="/ventes"
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
            >
              <Icon name="plus" className="h-4 w-4" /> Vente
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
