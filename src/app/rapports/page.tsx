"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { addDays, dayKey, fcfa, fcfaCompact, formatDateCourt, jourSemaine } from "@/lib/format";
import { downloadCsv } from "@/lib/export";
import { Badge, Button, Card, PageHeader, ProgressBar, StatCard } from "@/components/ui";
import { RevenueChart } from "@/components/Charts";

const PERIODES = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
];

export default function RapportsPage() {
  const { state } = useApp();
  const active = state.boutiqueActiveId;
  const [periode, setPeriode] = useState(30);

  const today = useMemo(() => new Date(), []);
  const depuis = useMemo(() => addDays(today, -(periode - 1)), [today, periode]);
  const depuisKey = dayKey(depuis);

  const ventes = useMemo(
    () =>
      state.ventes.filter(
        (v) =>
          (active === "all" || v.boutiqueId === active) &&
          dayKey(new Date(v.date)) >= depuisKey,
      ),
    [state.ventes, active, depuisKey],
  );

  const prixAchat = useMemo(() => {
    const m = new Map<string, number>();
    state.produits.forEach((p) => m.set(p.id, p.prixAchat));
    return m;
  }, [state.produits]);

  const ca = ventes.reduce((s, v) => s + v.total, 0);
  const marge = ventes.reduce(
    (s, v) =>
      s +
      v.lignes.reduce(
        (ls, l) => ls + (l.prixUnitaire - (prixAchat.get(l.produitId) ?? l.prixUnitaire * 0.7)) * l.quantite,
        0,
      ),
    0,
  );
  const panierMoyen = ventes.length > 0 ? ca / ventes.length : 0;
  const tauxMarge = ca > 0 ? Math.round((marge / ca) * 100) : 0;

  const serie = useMemo(() => {
    const buckets = periode <= 7 ? periode : 15;
    const taille = Math.ceil(periode / buckets);
    return Array.from({ length: buckets }).map((_, idx) => {
      const fin = addDays(today, -(buckets - 1 - idx) * taille);
      const debut = addDays(fin, -(taille - 1));
      const debutK = dayKey(debut);
      const finK = dayKey(fin);
      const value = state.ventes
        .filter((v) => {
          if (active !== "all" && v.boutiqueId !== active) return false;
          const k = dayKey(new Date(v.date));
          return k >= debutK && k <= finK;
        })
        .reduce((s, v) => s + v.total, 0);
      return {
        label: taille === 1 ? jourSemaine(fin) : formatDateCourt(fin.toISOString()),
        value,
        highlight: idx === buckets - 1,
      };
    });
  }, [state.ventes, active, today, periode]);

  const topProduits = useMemo(() => {
    const map = new Map<string, { id: string; nom: string; qte: number; ca: number; marge: number }>();
    ventes.forEach((v) =>
      v.lignes.forEach((l) => {
        const achat = prixAchat.get(l.produitId) ?? l.prixUnitaire * 0.7;
        const cur = map.get(l.produitId) ?? { id: l.produitId, nom: l.nom, qte: 0, ca: 0, marge: 0 };
        cur.qte += l.quantite;
        cur.ca += l.prixUnitaire * l.quantite;
        cur.marge += (l.prixUnitaire - achat) * l.quantite;
        map.set(l.produitId, cur);
      }),
    );
    return Array.from(map.values()).sort((a, b) => b.ca - a.ca).slice(0, 10);
  }, [ventes, prixAchat]);

  const lents = useMemo(() => {
    const vendus = new Set<string>();
    ventes.forEach((v) => v.lignes.forEach((l) => vendus.add(l.produitId)));
    return state.produits
      .filter((p) => (active === "all" || p.boutiqueId === active) && !vendus.has(p.id))
      .map((p) => ({ ...p, valeur: p.stock * p.prixAchat }))
      .sort((a, b) => b.valeur - a.valeur)
      .slice(0, 8);
  }, [state.produits, ventes, active]);

  const maxQte = Math.max(1, ...topProduits.map((p) => p.qte));

  function exporter() {
    const rows: (string | number)[][] = [["Produit", "Quantité vendue", "CA (FCFA)", "Marge (FCFA)"]];
    topProduits.forEach((p) => rows.push([p.nom, p.qte, Math.round(p.ca), Math.round(p.marge)]));
    rows.push([], ["Période", `${periode} jours`], ["CA total", Math.round(ca)], ["Marge totale", Math.round(marge)]);
    downloadCsv(`boutika-rapport-${periode}j.csv`, rows);
  }

  return (
    <div>
      <PageHeader
        title="Rapports"
        subtitle="Analysez le chiffre d'affaires, les marges et la rotation des produits."
        actions={
          <>
            <div className="flex rounded-xl border border-neutral-200 bg-white p-1">
              {PERIODES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriode(p.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    periode === p.value ? "bg-emerald-600 text-white" : "text-neutral-500 hover:bg-neutral-100"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button variant="secondary" icon="download" onClick={exporter}>
              Exporter
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Chiffre d'affaires" value={fcfa(ca)} sub={`${ventes.length} ventes`} icon="trendUp" tone="emerald" />
        <StatCard label="Marge brute" value={fcfa(marge)} sub={`${tauxMarge}% du chiffre d'affaires`} icon="cash" tone="sky" />
        <StatCard label="Panier moyen" value={fcfa(panierMoyen)} sub={`Période de ${periode} jours`} icon="cart" tone="violet" />
        <StatCard label="Produits vendus" value={`${topProduits.length}`} sub="Références distinctes" icon="box" tone="amber" />
      </div>

      <Card className="mb-4 p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Chiffre d&apos;affaires</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Du {formatDateCourt(depuis.toISOString())} au {formatDateCourt(today.toISOString())}
            </p>
          </div>
          <Badge tone="success">{fcfaCompact(ca)}</Badge>
        </div>
        <RevenueChart data={serie} height={220} />
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <h2 className="text-sm font-bold text-neutral-900">Top produits</h2>
            <Badge tone="info">{topProduits.length}</Badge>
          </div>
          {topProduits.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-neutral-400">Aucune vente sur la période.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {topProduits.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-5 shrink-0 text-center text-xs font-bold text-neutral-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-800">{p.nom}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <ProgressBar value={p.qte} max={maxQte} className="max-w-[180px]" />
                      <span className="text-[11px] text-neutral-400">{p.qte} vendus</span>
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <p className="text-sm font-bold text-neutral-900">{fcfaCompact(p.ca)}</p>
                    <p className="text-[11px] text-emerald-600">+{fcfaCompact(p.marge)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-neutral-100 px-4 py-3">
            <h2 className="text-sm font-bold text-neutral-900">Produits lents</h2>
            <p className="mt-0.5 text-[11px] text-neutral-500">Aucune vente sur la période</p>
          </div>
          {lents.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-neutral-400">Tous les produits tournent.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {lents.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-neutral-800">{p.nom}</p>
                    <p className="text-[11px] text-neutral-400">{p.stock} {p.unite} en stock</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-neutral-700">{fcfaCompact(p.valeur)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
