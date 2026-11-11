"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { fcfa, formatDate, formatHeure } from "@/lib/format";
import type { Operateur, Paiement } from "@/lib/types";
import { downloadCsv } from "@/lib/export";
import { Badge, Button, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { PaymentMix } from "@/components/Charts";
import { Icon } from "@/components/icons";

const OPERATEURS: { value: Operateur; label: string }[] = [
  { value: "mtn_momo", label: "MTN MoMo" },
  { value: "orange_money", label: "Orange Money" },
  { value: "espece", label: "Espèces" },
];

export default function PaiementsPage() {
  const { state } = useApp();
  const active = state.boutiqueActiveId;
  const [filtre, setFiltre] = useState<"tous" | Operateur>("tous");

  const boutiqueDuPaiement = (p: Paiement): string | undefined => {
    if (p.venteId) return state.ventes.find((v) => v.id === p.venteId)?.boutiqueId;
    if (p.factureId) return state.factures.find((f) => f.id === p.factureId)?.boutiqueId;
    return undefined;
  };

  const paiements = useMemo(
    () =>
      state.paiements
        .filter((p) => {
          if (active !== "all" && boutiqueDuPaiement(p) !== active) return false;
          if (filtre !== "tous" && p.operateur !== filtre) return false;
          return true;
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.paiements, state.ventes, state.factures, active, filtre],
  );

  const tous = useMemo(
    () => state.paiements.filter((p) => (active === "all" ? true : boutiqueDuPaiement(p) === active)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.paiements, state.ventes, state.factures, active],
  );

  const total = tous.reduce((s, p) => s + p.montant, 0);
  const digital = tous.filter((p) => p.operateur !== "espece").reduce((s, p) => s + p.montant, 0);
  const especes = tous.filter((p) => p.operateur === "espece").reduce((s, p) => s + p.montant, 0);
  const partDigital = total > 0 ? Math.round((digital / total) * 100) : 0;

  const mix = [
    { label: "MTN Mobile Money", value: tous.filter((p) => p.operateur === "mtn_momo").reduce((s, p) => s + p.montant, 0), color: "bg-amber-500" },
    { label: "Orange Money", value: tous.filter((p) => p.operateur === "orange_money").reduce((s, p) => s + p.montant, 0), color: "bg-orange-500" },
    { label: "Espèces", value: especes, color: "bg-neutral-400" },
  ];

  const document = (p: Paiement): string => {
    if (p.venteId) return state.ventes.find((v) => v.id === p.venteId)?.numero ?? "Vente";
    if (p.factureId) return state.factures.find((f) => f.id === p.factureId)?.numero ?? "Facture";
    return "—";
  };

  function exporter() {
    const rows: (string | number)[][] = [
      ["Référence", "Date", "Opérateur", "Téléphone", "Document", "Montant", "Statut"],
    ];
    paiements.forEach((p) =>
      rows.push([
        p.reference,
        formatDate(p.date),
        OPERATEURS.find((o) => o.value === p.operateur)?.label ?? p.operateur,
        p.telephone,
        document(p),
        p.montant,
        p.statut,
      ]),
    );
    downloadCsv("boutika-paiements.csv", rows);
  }

  return (
    <div>
      <PageHeader
        title="Paiements"
        subtitle="Réconciliation des encaissements Mobile Money et espèces."
        actions={<Button variant="secondary" icon="download" onClick={exporter}>Exporter</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total encaissé" value={fcfa(total)} sub={`${tous.length} transactions`} icon="wallet" tone="emerald" />
        <StatCard label="Encaissé Mobile Money" value={fcfa(digital)} sub={`${partDigital}% du total`} icon="phone" tone="amber" />
        <StatCard label="Espèces" value={fcfa(especes)} sub={`${100 - partDigital}% du total`} icon="cash" tone="sky" />
        <StatCard label="Part du digital" value={`${partDigital}%`} sub="Objectif : réduire le cash" icon="trendUp" tone="violet" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 p-4">
            {(["tous", ...OPERATEURS.map((o) => o.value)] as const).map((v) => {
              const label = v === "tous" ? "Tous" : OPERATEURS.find((o) => o.value === v)?.label;
              return (
                <button
                  key={v}
                  onClick={() => setFiltre(v)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    filtre === v ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-neutral-50/70 text-[11px] uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Référence</th>
                  <th className="px-4 py-3 font-semibold">Opérateur</th>
                  <th className="px-4 py-3 font-semibold">Téléphone</th>
                  <th className="px-4 py-3 font-semibold">Document</th>
                  <th className="px-4 py-3 text-right font-semibold">Montant</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paiements.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon="wallet" title="Aucun paiement" description="Les encaissements de la caisse apparaîtront ici." />
                    </td>
                  </tr>
                ) : (
                  paiements.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/60">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-neutral-800">{p.reference}</p>
                        <p className="text-[11px] text-neutral-400">
                          {formatDate(p.date)} · {formatHeure(p.date)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={p.operateur === "mtn_momo" ? "warning" : p.operateur === "orange_money" ? "danger" : "neutral"}>
                          {OPERATEURS.find((o) => o.value === p.operateur)?.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{p.telephone}</td>
                      <td className="px-4 py-3 text-neutral-600">{document(p)}</td>
                      <td className="px-4 py-3 text-right font-bold text-neutral-900">{fcfa(p.montant)}</td>
                      <td className="px-4 py-3">
                        <Badge tone="success">
                          <Icon name="check" className="h-3 w-3" /> Réussi
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <h2 className="text-sm font-bold text-neutral-900">Volume par opérateur</h2>
            <p className="mb-4 mt-0.5 text-xs text-neutral-500">Répartition des encaissements</p>
            <PaymentMix data={mix} />
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Icon name="spark" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-neutral-900">Encaissement digital</p>
                <p className="text-xs text-neutral-500">Moins de cash, plus de traçabilité.</p>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-xs text-neutral-600">
              <p className="flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 text-emerald-600" /> Réconciliation automatique des ventes
              </p>
              <p className="flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 text-emerald-600" /> Reçus et factures liés au paiement
              </p>
              <p className="flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 text-emerald-600" /> Suivi des impayés en temps réel
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
