"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { addDays, dayKey, fcfa, fcfaCompact, formatDateCourt, formatHeure, jourSemaine } from "@/lib/format";
import { downloadCsv } from "@/lib/export";
import { Badge, Button, Card, PageHeader, ProgressBar, StatCard } from "@/components/ui";
import { PaymentMix, RevenueChart } from "@/components/Charts";
import { Icon } from "@/components/icons";

export default function DashboardPage() {
  const { state } = useApp();
  const active = state.boutiqueActiveId;

  const produits = useMemo(
    () => state.produits.filter((p) => active === "all" || p.boutiqueId === active),
    [state.produits, active],
  );
  const ventes = useMemo(
    () => state.ventes.filter((v) => active === "all" || v.boutiqueId === active),
    [state.ventes, active],
  );
  const factures = useMemo(
    () => state.factures.filter((f) => active === "all" || f.boutiqueId === active),
    [state.factures, active],
  );

  const today = useMemo(() => new Date(), []);
  const todayKey = dayKey(today);
  const hierKey = dayKey(addDays(today, -1));

  const ventesJour = ventes.filter((v) => dayKey(new Date(v.date)) === todayKey);
  const ventesHier = ventes.filter((v) => dayKey(new Date(v.date)) === hierKey);

  const caJour = ventesJour.reduce((s, v) => s + v.total, 0);
  const caHier = ventesHier.reduce((s, v) => s + v.total, 0);
  const evolution = caHier > 0 ? Math.round(((caJour - caHier) / caHier) * 100) : null;

  const prixAchat = useMemo(() => {
    const m = new Map<string, number>();
    state.produits.forEach((p) => m.set(p.id, p.prixAchat));
    return m;
  }, [state.produits]);

  const margeJour = ventesJour.reduce(
    (s, v) =>
      s +
      v.lignes.reduce(
        (ls, l) => ls + (l.prixUnitaire - (prixAchat.get(l.produitId) ?? l.prixUnitaire * 0.7)) * l.quantite,
        0,
      ),
    0,
  );

  const creances =
    factures.filter((f) => f.statut !== "payee" && f.statut !== "brouillon").reduce((s, f) => s + f.total, 0) +
    ventes.filter((v) => v.statut === "credit").reduce((s, v) => s + v.total, 0);

  const alertes = useMemo(
    () =>
      produits
        .filter((p) => p.stock <= p.seuil)
        .sort((a, b) => a.stock / Math.max(1, a.seuil) - b.stock / Math.max(1, b.seuil)),
    [produits],
  );

  const serie7j = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, idx) => {
        const i = 6 - idx;
        const d = addDays(today, -i);
        const key = dayKey(d);
        const value = ventes.filter((v) => dayKey(new Date(v.date)) === key).reduce((s, v) => s + v.total, 0);
        return { label: jourSemaine(d), value, highlight: i === 0 };
      }),
    [ventes, today],
  );

  const total7j = serie7j.reduce((s, d) => s + d.value, 0);

  const mix = useMemo(() => {
    const since = addDays(today, -30).getTime();
    const recentes = ventes.filter((v) => new Date(v.date).getTime() >= since && v.statut !== "credit");
    const sum = (m: string) => recentes.filter((v) => v.modePaiement === m).reduce((s, v) => s + v.total, 0);
    return [
      { label: "Espèces", value: sum("espece"), color: "bg-neutral-400" },
      { label: "MTN Mobile Money", value: sum("mtn_momo"), color: "bg-amber-500" },
      { label: "Orange Money", value: sum("orange_money"), color: "bg-orange-500" },
    ];
  }, [ventes, today]);

  const topProduits = useMemo(() => {
    const since = addDays(today, -30).getTime();
    const map = new Map<string, { id: string; nom: string; qte: number; ca: number }>();
    ventes
      .filter((v) => new Date(v.date).getTime() >= since)
      .forEach((v) =>
        v.lignes.forEach((l) => {
          const cur = map.get(l.produitId) ?? { id: l.produitId, nom: l.nom, qte: 0, ca: 0 };
          cur.qte += l.quantite;
          cur.ca += l.prixUnitaire * l.quantite;
          map.set(l.produitId, cur);
        }),
      );
    return Array.from(map.values())
      .sort((a, b) => b.qte - a.qte)
      .slice(0, 5);
  }, [ventes, today]);

  const dernieresVentes = useMemo(
    () => [...ventes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6),
    [ventes],
  );

  const boutiqueNom = (id: string) => state.boutiques.find((b) => b.id === id)?.nom ?? "—";
  const maxTop = Math.max(1, ...topProduits.map((p) => p.qte));

  function exporter() {
    const rows: (string | number)[][] = [["Jour", "Chiffre d'affaires (FCFA)"]];
    serie7j.forEach((d) => rows.push([d.label, d.value]));
    rows.push([], ["Total 7 jours", total7j]);
    downloadCsv("boutika-ca-7jours.csv", rows);
  }

  return (
    <div>
      <PageHeader
        title={`Bonjour, ${state.utilisateur?.nom ?? state.parametres.entreprise}`}
        subtitle={
          state.utilisateur?.role === "super_admin"
            ? "Vue consolidée de toutes les boutiques de la plateforme."
            : "Voici l'activité de vos boutiques aujourd'hui."
        }
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={exporter}>
              Exporter
            </Button>
            <Link
              href="/ventes"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <Icon name="plus" className="h-4 w-4" /> Nouvelle vente
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Chiffre d'affaires du jour"
          value={fcfa(caJour)}
          sub={`${ventesJour.length} vente(s) aujourd'hui`}
          icon="trendUp"
          tone="emerald"
          trend={evolution !== null ? { value: `${evolution >= 0 ? "+" : ""}${evolution}% vs hier`, up: evolution >= 0 } : undefined}
        />
        <StatCard
          label="Marge du jour"
          value={fcfa(margeJour)}
          sub={caJour > 0 ? `${Math.round((margeJour / caJour) * 100)}% de marge` : "Aucune vente"}
          icon="cash"
          tone="sky"
        />
        <StatCard
          label="Créances clients"
          value={fcfa(creances)}
          sub="Factures et ventes à crédit"
          icon="file"
          tone="amber"
        />
        <StatCard
          label="Alertes de stock"
          value={`${alertes.length}`}
          sub={`${produits.length} produits suivis`}
          icon="alert"
          tone="rose"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="p-4 sm:p-5 xl:col-span-2">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Chiffre d&apos;affaires — 7 derniers jours</h2>
              <p className="mt-0.5 text-xs text-neutral-500">Total {fcfa(total7j)}</p>
            </div>
            <Badge tone="success">
              <Icon name="trendUp" className="h-3 w-3" /> Temps réel
            </Badge>
          </div>
          <RevenueChart data={serie7j} />
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="text-sm font-bold text-neutral-900">Répartition des paiements</h2>
          <p className="mb-4 mt-0.5 text-xs text-neutral-500">30 derniers jours</p>
          <PaymentMix data={mix} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900">Top produits</h2>
            <Link href="/stock" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Voir le stock
            </Link>
          </div>
          {topProduits.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-400">Aucune vente récente.</p>
          ) : (
            <div className="space-y-3.5">
              {topProduits.map((p) => (
                <div key={p.id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-neutral-700">{p.nom}</span>
                    <span className="shrink-0 text-[11px] text-neutral-500">
                      {p.qte} · {fcfaCompact(p.ca)}
                    </span>
                  </div>
                  <ProgressBar value={p.qte} max={maxTop} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900">Alertes de stock</h2>
            <Badge tone={alertes.length ? "warning" : "success"}>{alertes.length} alerte(s)</Badge>
          </div>
          {alertes.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-400">Tous les stocks sont suffisants.</p>
          ) : (
            <div className="space-y-3">
              {alertes.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      p.stock === 0 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    <Icon name={p.stock === 0 ? "alert" : "box"} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-neutral-800">{p.nom}</p>
                    <p className="truncate text-[11px] text-neutral-500">{boutiqueNom(p.boutiqueId)}</p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-bold ${p.stock === 0 ? "text-red-600" : "text-amber-600"}`}
                  >
                    {p.stock === 0 ? "Rupture" : `${p.stock}/${p.seuil}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4 sm:px-5">
            <h2 className="text-sm font-bold text-neutral-900">Dernières ventes</h2>
            <Link href="/ventes" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Tout voir
            </Link>
          </div>
          <div className="divide-y divide-neutral-100 border-t border-neutral-100">
            {dernieresVentes.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-neutral-400">Aucune vente enregistrée.</p>
            ) : (
              dernieresVentes.map((v) => (
                <div key={v.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-neutral-800">{v.numero}</p>
                    <p className="truncate text-[11px] text-neutral-500">
                      {formatDateCourt(v.date)} · {formatHeure(v.date)} · {boutiqueNom(v.boutiqueId)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-neutral-900">{fcfa(v.total)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-neutral-400">
                      {v.modePaiement === "espece"
                        ? "Espèces"
                        : v.modePaiement === "mtn_momo"
                          ? "MTN MoMo"
                          : v.modePaiement === "orange_money"
                            ? "Orange Money"
                            : "Crédit"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
