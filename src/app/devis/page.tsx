"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { addDays, dayKey, fcfa, formatDate } from "@/lib/format";
import type { Devis, StatutDevis } from "@/lib/types";
import {
  Button,
  Card,
  EmptyState,
  Modal,
  PageHeader,
  StatCard,
  inputClass,
  labelClass,
} from "@/components/ui";
import { Icon } from "@/components/icons";

type LigneForm = { produitId: string; quantite: number };

const STATUTS: { value: StatutDevis; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "envoye", label: "Envoyé" },
  { value: "accepte", label: "Accepté" },
  { value: "refuse", label: "Refusé" },
];

export default function DevisPage() {
  const { state, creerDevis, changerStatutDevis, convertirDevis, deleteDevis } = useApp();
  const active = state.boutiqueActiveId;
  const boutiquesActives = useMemo(() => state.boutiques.filter((b) => b.actif), [state.boutiques]);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [modalOuvert, setModalOuvert] = useState(false);
  const [aSupprimer, setASupprimer] = useState<Devis | null>(null);
  const [info, setInfo] = useState("");

  const [clientId, setClientId] = useState("");
  const [clientNom, setClientNom] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [boutiqueId, setBoutiqueId] = useState(active !== "all" ? active : boutiquesActives[0]?.id ?? "");
  const [validite, setValidite] = useState(dayKey(addDays(new Date(), 15)));
  const [lignes, setLignes] = useState<LigneForm[]>([]);
  const [produitSel, setProduitSel] = useState("");
  const [qteSel, setQteSel] = useState("1");
  const [erreur, setErreur] = useState("");

  const devis = useMemo(
    () => state.devis.filter((d) => (active === "all" ? true : d.boutiqueId === active)),
    [state.devis, active],
  );

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return devis
      .filter((d) => {
        const okQ = !q || d.clientNom.toLowerCase().includes(q) || d.numero.toLowerCase().includes(q);
        const okStatut = filtreStatut === "Tous" || d.statut === filtreStatut;
        return okQ && okStatut;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [devis, recherche, filtreStatut]);

  const totalDevis = devis.reduce((s, d) => s + d.total, 0);
  const acceptes = devis.filter((d) => d.statut === "accepte");
  const envoyes = devis.filter((d) => d.statut === "envoye");
  const tauxConversion = devis.length > 0 ? Math.round((acceptes.length / devis.length) * 100) : 0;

  const boutiqueNom = (id: string) => state.boutiques.find((b) => b.id === id)?.nom ?? "—";
  const produitsBoutique = useMemo(
    () => state.produits.filter((p) => p.boutiqueId === boutiqueId),
    [state.produits, boutiqueId],
  );

  function ouvrirCreation() {
    const bId = active !== "all" ? active : boutiquesActives[0]?.id ?? "";
    setClientId("");
    setClientNom("");
    setClientTel("");
    setBoutiqueId(bId);
    setValidite(dayKey(addDays(new Date(), 15)));
    setLignes([]);
    setProduitSel(state.produits.find((p) => p.boutiqueId === bId)?.id ?? "");
    setQteSel("1");
    setErreur("");
    setModalOuvert(true);
  }

  function ajouterLigne() {
    const p = state.produits.find((x) => x.id === produitSel);
    const qte = Math.max(1, Math.round(Number(qteSel) || 1));
    if (!p) return;
    setLignes((prev) => {
      const exist = prev.find((l) => l.produitId === p.id);
      if (exist) return prev.map((l) => (l.produitId === p.id ? { ...l, quantite: l.quantite + qte } : l));
      return [...prev, { produitId: p.id, quantite: qte }];
    });
  }

  const lignesDetail = lignes.flatMap((l) => {
    const p = state.produits.find((x) => x.id === l.produitId);
    return p ? [{ produit: p, quantite: l.quantite }] : [];
  });
  const sousTotal = lignesDetail.reduce((s, l) => s + l.produit.prixVente * l.quantite, 0);
  const tvaPreview = Math.round((sousTotal * state.parametres.tva) / 100);

  async function enregistrer() {
    if (!clientNom.trim()) return setErreur("Le nom du client est obligatoire.");
    if (lignesDetail.length === 0) return setErreur("Ajoutez au moins un produit.");
    await creerDevis({
      boutiqueId,
      clientId: clientId || undefined,
      clientNom: clientNom.trim(),
      clientTel: clientTel.trim() || undefined,
      validite: new Date(`${validite}T12:00:00`).toISOString(),
      lignes: lignesDetail.map((l) => ({
        produitId: l.produit.id,
        nom: l.produit.nom,
        prixUnitaire: l.produit.prixVente,
        quantite: l.quantite,
      })),
    });
    setModalOuvert(false);
  }

  async function convertir(d: Devis) {
    setInfo("");
    const facture = await convertirDevis(d.id);
    if (facture) setInfo(`Devis ${d.numero} converti en facture ${facture.numero}.`);
  }

  return (
    <div>
      <PageHeader
        title="Devis"
        subtitle="Créez des devis, générez le PDF en un clic et convertissez-les en facture."
        actions={<Button icon="plus" onClick={ouvrirCreation}>Nouveau devis</Button>}
      />

      {info ? <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{info}</p> : null}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total devisé" value={fcfa(totalDevis)} sub={`${devis.length} devis`} icon="file" tone="emerald" />
        <StatCard label="Acceptés" value={`${acceptes.length}`} sub={fcfa(acceptes.reduce((s, d) => s + d.total, 0))} icon="check" tone="sky" />
        <StatCard label="En attente" value={`${envoyes.length}`} sub="Devis envoyés" icon="wallet" tone="amber" />
        <StatCard label="Taux de conversion" value={`${tauxConversion}%`} sub="Devis acceptés" icon="trendUp" tone="violet" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un client ou un numéro…"
              className={`${inputClass} pl-9`}
            />
          </div>
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className={`${inputClass} sm:w-44`}>
            <option value="Tous">Tous les statuts</option>
            {STATUTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-neutral-50/70 text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Devis</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Boutique</th>
                <th className="px-4 py-3 font-semibold">Validité</th>
                <th className="px-4 py-3 text-right font-semibold">TVA</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtres.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon="file"
                      title="Aucun devis"
                      description="Créez un devis professionnel avec logo et TVA."
                      action={<Button icon="plus" onClick={ouvrirCreation}>Nouveau devis</Button>}
                    />
                  </td>
                </tr>
              ) : (
                filtres.map((d) => (
                  <tr key={d.id} className="hover:bg-neutral-50/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-neutral-800">{d.numero}</p>
                      <p className="text-[11px] text-neutral-400">{formatDate(d.date)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-800">{d.clientNom}</p>
                      <p className="text-[11px] text-neutral-400">{d.clientTel ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{boutiqueNom(d.boutiqueId)}</td>
                    <td className="px-4 py-3 text-neutral-600">{formatDate(d.validite)}</td>
                    <td className="px-4 py-3 text-right text-neutral-600">{fcfa(d.tva)}</td>
                    <td className="px-4 py-3 text-right font-bold text-neutral-900">{fcfa(d.total)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={d.statut}
                        onChange={(e) => changerStatutDevis(d.id, e.target.value as StatutDevis)}
                        className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-neutral-700 outline-none focus:border-emerald-500"
                      >
                        {STATUTS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/api/devis/${d.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-200"
                        >
                          PDF
                        </a>
                        <button
                          onClick={() => convertir(d)}
                          className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Facturer
                        </button>
                        <button
                          onClick={() => setASupprimer(d)}
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
        title="Nouveau devis"
        description="Le devis n'impacte pas le stock tant qu'il n'est pas facturé."
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOuvert(false)}>Annuler</Button>
            <Button icon="check" onClick={enregistrer}>Créer le devis</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Client enregistré</label>
            <select
              value={clientId}
              onChange={(e) => {
                const id = e.target.value;
                setClientId(id);
                const c = state.clients.find((x) => x.id === id);
                setClientNom(c?.nom ?? "");
                setClientTel(c?.telephone ?? "");
              }}
              className={inputClass}
            >
              <option value="">Saisie libre</option>
              {state.clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Nom du client</label>
            <input
              value={clientNom}
              onChange={(e) => {
                setClientNom(e.target.value);
                setClientId("");
              }}
              placeholder="Nom du client"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input value={clientTel} onChange={(e) => setClientTel(e.target.value)} placeholder="+237…" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Boutique</label>
            <select
              value={boutiqueId}
              onChange={(e) => {
                setBoutiqueId(e.target.value);
                setLignes([]);
                setProduitSel(state.produits.find((p) => p.boutiqueId === e.target.value)?.id ?? "");
              }}
              className={inputClass}
            >
              {boutiquesActives.map((b) => (
                <option key={b.id} value={b.id}>{b.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Valable jusqu&apos;au</label>
            <input type="date" value={validite} onChange={(e) => setValidite(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="mt-5">
          <p className={labelClass}>Produits</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={produitSel} onChange={(e) => setProduitSel(e.target.value)} className={`${inputClass} flex-1`}>
              {produitsBoutique.length === 0 ? <option value="">Aucun produit</option> : null}
              {produitsBoutique.map((p) => (
                <option key={p.id} value={p.id}>{p.nom} — {fcfa(p.prixVente)}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={qteSel}
              onChange={(e) => setQteSel(e.target.value)}
              className={`${inputClass} sm:w-24`}
              aria-label="Quantité"
            />
            <Button variant="secondary" icon="plus" onClick={ajouterLigne}>Ajouter</Button>
          </div>

          <div className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
            {lignesDetail.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-neutral-400">Aucune ligne ajoutée.</p>
            ) : (
              lignesDetail.map((l) => (
                <div key={l.produit.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="flex-1 text-neutral-700">
                    {l.produit.nom} <span className="text-neutral-400">×{l.quantite}</span>
                  </span>
                  <span className="font-semibold text-neutral-900">{fcfa(l.produit.prixVente * l.quantite)}</span>
                  <button
                    onClick={() => setLignes((prev) => prev.filter((x) => x.produitId !== l.produit.id))}
                    className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Retirer"
                  >
                    <Icon name="trash" className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-neutral-500">
              <span>Sous-total</span>
              <span>{fcfa(sousTotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-500">
              <span>TVA ({state.parametres.tva}%)</span>
              <span>{fcfa(tvaPreview)}</span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-1 text-base font-extrabold text-neutral-900">
              <span>Total</span>
              <span>{fcfa(sousTotal + tvaPreview)}</span>
            </div>
          </div>

          {erreur ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{erreur}</p> : null}
        </div>
      </Modal>

      <Modal
        open={!!aSupprimer}
        onClose={() => setASupprimer(null)}
        title="Supprimer le devis"
        description="Cette action est définitive."
        footer={
          <>
            <Button variant="secondary" onClick={() => setASupprimer(null)}>Annuler</Button>
            <Button
              variant="danger"
              icon="trash"
              onClick={() => {
                if (aSupprimer) deleteDevis(aSupprimer.id);
                setASupprimer(null);
              }}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">
          Supprimer le devis <span className="font-semibold text-neutral-900">{aSupprimer?.numero}</span> ?
        </p>
      </Modal>
    </div>
  );
}
