"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { fcfa } from "@/lib/format";
import type { Produit } from "@/lib/types";
import { downloadCsv } from "@/lib/export";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, ProgressBar, StatCard, inputClass, labelClass } from "@/components/ui";
import { Icon } from "@/components/icons";

type FormProduit = {
  id?: string;
  nom: string;
  sku: string;
  categorie: string;
  boutiqueId: string;
  prixAchat: string;
  prixVente: string;
  stock: string;
  seuil: string;
  unite: string;
};

const formVide = (boutiqueId: string): FormProduit => ({
  nom: "",
  sku: "",
  categorie: "Épicerie",
  boutiqueId,
  prixAchat: "",
  prixVente: "",
  stock: "0",
  seuil: "5",
  unite: "pièce",
});

export default function StockPage() {
  const { state, addProduit, updateProduit, ajusterStock, deleteProduit } = useApp();
  const active = state.boutiqueActiveId;

  const boutiquesActives = useMemo(() => state.boutiques.filter((b) => b.actif), [state.boutiques]);

  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("Toutes");
  const [statut, setStatut] = useState("Tous");
  const [modalOuvert, setModalOuvert] = useState(false);
  const [form, setForm] = useState<FormProduit>(formVide(boutiquesActives[0]?.id ?? ""));
  const [erreur, setErreur] = useState("");
  const [aSupprimer, setASupprimer] = useState<Produit | null>(null);

  const produits = useMemo(
    () => state.produits.filter((p) => (active === "all" ? true : p.boutiqueId === active)),
    [state.produits, active],
  );

  const categories = useMemo(
    () => ["Toutes", ...Array.from(new Set(state.produits.map((p) => p.categorie)))],
    [state.produits],
  );

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return produits.filter((p) => {
      const okQ = !q || p.nom.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      const okCat = categorie === "Toutes" || p.categorie === categorie;
      const okStatut =
        statut === "Tous" ||
        (statut === "Rupture" && p.stock === 0) ||
        (statut === "Faible" && p.stock > 0 && p.stock <= p.seuil) ||
        (statut === "OK" && p.stock > p.seuil);
      return okQ && okCat && okStatut;
    });
  }, [produits, recherche, categorie, statut]);

  const valeurStock = produits.reduce((s, p) => s + p.prixAchat * p.stock, 0);
  const valeurVente = produits.reduce((s, p) => s + p.prixVente * p.stock, 0);
  const alertes = produits.filter((p) => p.stock > 0 && p.stock <= p.seuil).length;
  const ruptures = produits.filter((p) => p.stock === 0).length;

  const boutiqueNom = (id: string) => state.boutiques.find((b) => b.id === id)?.nom ?? "—";

  function ouvrirAjout() {
    const bId = active !== "all" ? active : boutiquesActives[0]?.id ?? "";
    setForm(formVide(bId));
    setErreur("");
    setModalOuvert(true);
  }

  function ouvrirEdition(p: Produit) {
    setForm({
      id: p.id,
      nom: p.nom,
      sku: p.sku,
      categorie: p.categorie,
      boutiqueId: p.boutiqueId,
      prixAchat: String(p.prixAchat),
      prixVente: String(p.prixVente),
      stock: String(p.stock),
      seuil: String(p.seuil),
      unite: p.unite,
    });
    setErreur("");
    setModalOuvert(true);
  }

  function enregistrer() {
    if (!form.nom.trim()) return setErreur("Le nom du produit est obligatoire.");
    if (!form.boutiqueId) return setErreur("Sélectionnez une boutique.");
    const prixVente = Number(form.prixVente);
    const prixAchat = Number(form.prixAchat);
    if (!prixVente || prixVente <= 0) return setErreur("Le prix de vente doit être supérieur à 0.");
    if (prixAchat < 0) return setErreur("Le prix d'achat est invalide.");

    const payload = {
      nom: form.nom.trim(),
      sku: form.sku.trim() || `SKU-${Date.now().toString().slice(-5)}`,
      categorie: form.categorie.trim() || "Divers",
      boutiqueId: form.boutiqueId,
      prixAchat: Math.round(prixAchat || 0),
      prixVente: Math.round(prixVente),
      stock: Math.max(0, Math.round(Number(form.stock) || 0)),
      seuil: Math.max(0, Math.round(Number(form.seuil) || 0)),
      unite: form.unite.trim() || "pièce",
    };

    if (form.id) void updateProduit(form.id, payload);
    else void addProduit(payload);
    setModalOuvert(false);
  }

  function ajuster(p: Produit, delta: number) {
    void ajusterStock(p.id, delta);
  }

  function exporter() {
    const rows: (string | number)[][] = [
      ["Produit", "SKU", "Catégorie", "Boutique", "Prix achat", "Prix vente", "Stock", "Seuil", "Statut"],
    ];
    filtres.forEach((p) =>
      rows.push([
        p.nom,
        p.sku,
        p.categorie,
        boutiqueNom(p.boutiqueId),
        p.prixAchat,
        p.prixVente,
        p.stock,
        p.seuil,
        p.stock === 0 ? "Rupture" : p.stock <= p.seuil ? "Faible" : "OK",
      ]),
    );
    downloadCsv("boutika-stock.csv", rows);
  }

  return (
    <div>
      <PageHeader
        title="Stock"
        subtitle="Suivez vos produits en temps réel et évitez les ruptures dans chaque boutique."
        actions={
          <>
            <Button variant="secondary" icon="download" onClick={exporter}>
              Exporter
            </Button>
            <Button icon="plus" onClick={ouvrirAjout}>
              Nouveau produit
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Valeur du stock (achat)" value={fcfa(valeurStock)} sub={`${produits.length} produits`} icon="box" tone="emerald" />
        <StatCard label="Valeur potentielle (vente)" value={fcfa(valeurVente)} sub="Au prix de vente" icon="cash" tone="sky" />
        <StatCard label="Stock faible" value={`${alertes}`} sub="Sous le seuil d'alerte" icon="alert" tone="amber" />
        <StatCard label="Ruptures" value={`${ruptures}`} sub="Produits à réapprovisionner" icon="alert" tone="rose" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher par nom ou SKU…"
              className={`${inputClass} pl-9`}
            />
          </div>
          <select value={categorie} onChange={(e) => setCategorie(e.target.value)} className={`${inputClass} sm:w-40`}>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select value={statut} onChange={(e) => setStatut(e.target.value)} className={`${inputClass} sm:w-36`}>
            {["Tous", "OK", "Faible", "Rupture"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-neutral-50/70 text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Produit</th>
                <th className="px-4 py-3 font-semibold">Boutique</th>
                <th className="px-4 py-3 font-semibold">Catégorie</th>
                <th className="px-4 py-3 text-right font-semibold">Prix vente</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtres.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon="box"
                      title="Aucun produit trouvé"
                      description="Ajustez vos filtres ou créez un nouveau produit."
                      action={<Button icon="plus" onClick={ouvrirAjout}>Nouveau produit</Button>}
                    />
                  </td>
                </tr>
              ) : (
                filtres.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-800">{p.nom}</p>
                      <p className="text-[11px] text-neutral-400">{p.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{boutiqueNom(p.boutiqueId)}</td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{p.categorie}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-neutral-900">{fcfa(p.prixVente)}</td>
                    <td className="px-4 py-3">
                      <div className="w-28">
                        <div className="mb-1 flex justify-between text-[11px]">
                          <span className="font-semibold text-neutral-700">{p.stock}</span>
                          <span className="text-neutral-400">seuil {p.seuil}</span>
                        </div>
                        <ProgressBar value={p.stock} max={Math.max(p.seuil * 2, p.stock, 1)} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.stock === 0 ? (
                        <Badge tone="danger">Rupture</Badge>
                      ) : p.stock <= p.seuil ? (
                        <Badge tone="warning">Faible</Badge>
                      ) : (
                        <Badge tone="success">OK</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => ajuster(p, -1)}
                          className="h-7 w-7 rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                          aria-label="Retirer une unité"
                        >
                          −
                        </button>
                        <button
                          onClick={() => ajuster(p, 1)}
                          className="h-7 w-7 rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                          aria-label="Ajouter une unité"
                        >
                          +
                        </button>
                        <button
                          onClick={() => ouvrirEdition(p)}
                          className="ml-1 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                          aria-label="Modifier"
                        >
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setASupprimer(p)}
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Supprimer"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOuvert}
        onClose={() => setModalOuvert(false)}
        title={form.id ? "Modifier le produit" : "Nouveau produit"}
        description="Ces informations alimentent le stock et la caisse."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOuvert(false)}>
              Annuler
            </Button>
            <Button icon="check" onClick={enregistrer}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nom du produit</label>
            <input
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex : Riz parfumé 5kg"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Code / SKU</label>
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="Auto si vide"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Catégorie</label>
            <input
              value={form.categorie}
              onChange={(e) => setForm({ ...form, categorie: e.target.value })}
              list="categories-list"
              className={inputClass}
            />
            <datalist id="categories-list">
              {categories.filter((c) => c !== "Toutes").map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelClass}>Boutique</label>
            <select
              value={form.boutiqueId}
              onChange={(e) => setForm({ ...form, boutiqueId: e.target.value })}
              className={inputClass}
            >
              {boutiquesActives.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Unité</label>
            <input
              value={form.unite}
              onChange={(e) => setForm({ ...form, unite: e.target.value })}
              placeholder="pièce, sac, casier…"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Prix d&apos;achat (FCFA)</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.prixAchat}
              onChange={(e) => setForm({ ...form, prixAchat: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Prix de vente (FCFA)</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.prixVente}
              onChange={(e) => setForm({ ...form, prixVente: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Stock actuel</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Seuil d&apos;alerte</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.seuil}
              onChange={(e) => setForm({ ...form, seuil: e.target.value })}
              className={inputClass}
            />
          </div>
          {erreur ? (
            <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{erreur}</p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={!!aSupprimer}
        onClose={() => setASupprimer(null)}
        title="Supprimer le produit"
        description="Cette action est définitive."
        footer={
          <>
            <Button variant="secondary" onClick={() => setASupprimer(null)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              icon="trash"
              onClick={() => {
                if (aSupprimer) void deleteProduit(aSupprimer.id);
                setASupprimer(null);
              }}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">
          Voulez-vous vraiment supprimer <span className="font-semibold text-neutral-900">{aSupprimer?.nom}</span> ?
        </p>
      </Modal>
    </div>
  );
}
