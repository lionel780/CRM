"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { addDays, fcfa } from "@/lib/format";
import { Badge, Button, Card, Modal, PageHeader, StatCard, inputClass, labelClass } from "@/components/ui";
import { Icon } from "@/components/icons";

export default function BoutiquesPage() {
  const { state, addBoutique, toggleBoutique, setBoutiqueActive } = useApp();
  const [modalOuvert, setModalOuvert] = useState(false);
  const [form, setForm] = useState({ nom: "", ville: "Douala", adresse: "", telephone: "" });
  const [erreur, setErreur] = useState("");

  const depuis7j = addDays(new Date(), -7).getTime();

  const stats = useMemo(
    () =>
      state.boutiques.map((b) => {
        const ventes = state.ventes.filter((v) => v.boutiqueId === b.id);
        const produits = state.produits.filter((p) => p.boutiqueId === b.id);
        return {
          boutique: b,
          ca7j: ventes.filter((v) => new Date(v.date).getTime() >= depuis7j).reduce((s, v) => s + v.total, 0),
          ventes: ventes.length,
          produits: produits.length,
          alertes: produits.filter((p) => p.stock <= p.seuil).length,
        };
      }),
    [state.boutiques, state.ventes, state.produits, depuis7j],
  );

  const caConsolide = stats.reduce((s, x) => s + x.ca7j, 0);
  const totalAlertes = stats.reduce((s, x) => s + x.alertes, 0);
  const meilleure = [...stats].sort((a, b) => b.ca7j - a.ca7j)[0];

  function enregistrer() {
    if (!form.nom.trim()) return setErreur("Le nom de la boutique est obligatoire.");
    addBoutique({
      nom: form.nom.trim(),
      ville: form.ville.trim() || "Douala",
      adresse: form.adresse.trim() || "—",
      telephone: form.telephone.trim() || "—",
    });
    setForm({ nom: "", ville: "Douala", adresse: "", telephone: "" });
    setModalOuvert(false);
  }

  return (
    <div>
      <PageHeader
        title="Mes boutiques"
        subtitle="Pilotez plusieurs points de vente depuis un seul tableau de bord."
        actions={<Button icon="plus" onClick={() => setModalOuvert(true)}>Nouvelle boutique</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Boutiques actives"
          value={`${state.boutiques.filter((b) => b.actif).length}`}
          sub={`${state.boutiques.length} au total`}
          icon="store"
          tone="emerald"
        />
        <StatCard label="CA consolidé (7j)" value={fcfa(caConsolide)} sub="Toutes boutiques" icon="trendUp" tone="sky" />
        <StatCard label="Meilleure boutique" value={meilleure?.boutique.nom ?? "—"} sub={meilleure ? fcfa(meilleure.ca7j) : ""} icon="spark" tone="violet" />
        <StatCard label="Alertes de stock" value={`${totalAlertes}`} sub="Toutes boutiques" icon="alert" tone="amber" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ boutique: b, ca7j, ventes, produits, alertes }) => (
          <Card key={b.id} className="overflow-hidden">
            <div className="h-1.5 w-full bg-linear-to-r from-emerald-500 via-emerald-400 to-lime-300" />
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Icon name="store" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{b.nom}</p>
                    <p className="text-xs text-neutral-500">{b.ville}</p>
                  </div>
                </div>
                <Badge tone={b.actif ? "success" : "neutral"}>{b.actif ? "Active" : "Inactive"}</Badge>
              </div>

              <div className="mt-3 space-y-1 text-xs text-neutral-500">
                <p className="flex items-center gap-2">
                  <Icon name="store" className="h-3.5 w-3.5 text-neutral-400" /> {b.adresse}
                </p>
                <p className="flex items-center gap-2">
                  <Icon name="phone" className="h-3.5 w-3.5 text-neutral-400" /> {b.telephone}
                </p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-neutral-50 p-3 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-neutral-400">CA 7j</p>
                  <p className="mt-0.5 text-xs font-bold text-neutral-900">{fcfa(ca7j)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-neutral-400">Produits</p>
                  <p className="mt-0.5 text-xs font-bold text-neutral-900">{produits}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-neutral-400">Ventes</p>
                  <p className="mt-0.5 text-xs font-bold text-neutral-900">{ventes}</p>
                </div>
              </div>

              {alertes > 0 ? (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                  <Icon name="alert" className="h-3.5 w-3.5" /> {alertes} produit(s) sous le seuil
                </p>
              ) : (
                <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                  <Icon name="check" className="h-3.5 w-3.5" /> Stocks à jour
                </p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href="/ventes"
                  onClick={() => setBoutiqueActive(b.id)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-neutral-800"
                >
                  <Icon name="cart" className="h-4 w-4" /> Ouvrir la caisse
                </Link>
                <button
                  onClick={() => toggleBoutique(b.id)}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                    b.actif
                      ? "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {b.actif ? "Désactiver" : "Activer"}
                </button>
              </div>
            </div>
          </Card>
        ))}

        <button
          onClick={() => setModalOuvert(true)}
          className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-neutral-200 bg-white/50 p-6 text-neutral-400 transition hover:border-emerald-300 hover:text-emerald-600"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100">
            <Icon name="plus" className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">Ajouter une boutique</span>
          <span className="text-xs">Ouvrez un nouveau point de vente</span>
        </button>
      </div>

      <Modal
        open={modalOuvert}
        onClose={() => setModalOuvert(false)}
        title="Nouvelle boutique"
        description="Chaque boutique a son propre stock et ses ventes."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOuvert(false)}>
              Annuler
            </Button>
            <Button icon="check" onClick={enregistrer}>
              Créer la boutique
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Nom de la boutique</label>
            <input
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex : Boutique Bonamoussadi"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Ville</label>
              <input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Téléphone</label>
              <input
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                placeholder="+237…"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Adresse</label>
            <input
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              placeholder="Quartier, rue…"
              className={inputClass}
            />
          </div>
          {erreur ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{erreur}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
