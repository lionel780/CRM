"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { addDays, dayKey, fcfa, formatDate } from "@/lib/format";
import type { Facture, Operateur } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, StatCard, inputClass, labelClass } from "@/components/ui";
import { Icon } from "@/components/icons";

type LigneForm = { produitId: string; quantite: number };

export default function FacturesPage() {
  const { state, creerFacture, payerFacture, deleteFacture } = useApp();
  const active = state.boutiqueActiveId;
  const boutiquesActives = useMemo(() => state.boutiques.filter((b) => b.actif), [state.boutiques]);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("Tous");
  const [modalOuvert, setModalOuvert] = useState(false);
  const [detail, setDetail] = useState<Facture | null>(null);
  const [aPayer, setAPayer] = useState<Facture | null>(null);
  const [operateur, setOperateur] = useState<Operateur>("mtn_momo");
  const [telephone, setTelephone] = useState("");
  const [aSupprimer, setASupprimer] = useState<Facture | null>(null);

  const [clientNom, setClientNom] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [boutiqueId, setBoutiqueId] = useState(
    active !== "all" ? active : boutiquesActives[0]?.id ?? "",
  );
  const [echeance, setEcheance] = useState(dayKey(addDays(new Date(), 15)));
  const [lignes, setLignes] = useState<LigneForm[]>([]);
  const [produitSel, setProduitSel] = useState("");
  const [qteSel, setQteSel] = useState("1");
  const [erreur, setErreur] = useState("");

  const factures = useMemo(
    () => state.factures.filter((f) => (active === "all" ? true : f.boutiqueId === active)),
    [state.factures, active],
  );

  const statutEffectif = (f: Facture): Facture["statut"] => {
    if (f.statut === "payee" || f.statut === "brouillon") return f.statut;
    return new Date(f.echeance).getTime() < new Date().setHours(0, 0, 0, 0) ? "retard" : "envoyee";
  };

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return factures
      .filter((f) => {
        const okQ = !q || f.clientNom.toLowerCase().includes(q) || f.numero.toLowerCase().includes(q);
        const okStatut = filtreStatut === "Tous" || statutEffectif(f) === filtreStatut;
        return okQ && okStatut;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [factures, recherche, filtreStatut]);

  const totalFacture = factures.reduce((s, f) => s + f.total, 0);
  const totalPaye = factures.filter((f) => f.statut === "payee").reduce((s, f) => s + f.total, 0);
  const totalImpaye = factures.filter((f) => f.statut !== "payee" && f.statut !== "brouillon").reduce((s, f) => s + f.total, 0);
  const totalRetard = factures
    .filter((f) => statutEffectif(f) === "retard")
    .reduce((s, f) => s + f.total, 0);

  const boutiqueNom = (id: string) => state.boutiques.find((b) => b.id === id)?.nom ?? "—";
  const produitsBoutique = useMemo(
    () => state.produits.filter((p) => p.boutiqueId === boutiqueId),
    [state.produits, boutiqueId],
  );

  function ouvrirCreation() {
    const bId = active !== "all" ? active : boutiquesActives[0]?.id ?? "";
    setBoutiqueId(bId);
    setClientNom("");
    setClientTel("");
    setEcheance(dayKey(addDays(new Date(), 15)));
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

  function enregistrer() {
    if (!clientNom.trim()) return setErreur("Le nom du client est obligatoire.");
    if (lignesDetail.length === 0) return setErreur("Ajoutez au moins un produit.");
    creerFacture({
      boutiqueId,
      clientNom: clientNom.trim(),
      clientTel: clientTel.trim() || undefined,
      echeance: new Date(`${echeance}T12:00:00`).toISOString(),
      lignes: lignesDetail.map((l) => ({
        produitId: l.produit.id,
        nom: l.produit.nom,
        prixUnitaire: l.produit.prixVente,
        quantite: l.quantite,
      })),
    });
    setModalOuvert(false);
  }

  function ouvrirPaiement(f: Facture) {
    setAPayer(f);
    setTelephone(f.clientTel ?? "");
    setOperateur(state.parametres.operateurs.mtn ? "mtn_momo" : "orange_money");
  }

  function confirmerPaiement() {
    if (!aPayer) return;
    payerFacture(aPayer.id, operateur, telephone.trim() || aPayer.clientTel || "+237 6 00 00 00 00");
    setAPayer(null);
  }

  const statutTone = (s: Facture["statut"]) =>
    s === "payee" ? "success" : s === "retard" ? "danger" : s === "brouillon" ? "neutral" : "info";
  const statutLabel = (s: Facture["statut"]) =>
    s === "payee" ? "Payée" : s === "retard" ? "En retard" : s === "brouillon" ? "Brouillon" : "Envoyée";

  return (
    <div>
      <PageHeader
        title="Factures"
        subtitle="Facturez avec TVA et encaissez par Mobile Money."
        actions={<Button icon="plus" onClick={ouvrirCreation}>Nouvelle facture</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total facturé" value={fcfa(totalFacture)} sub={`${factures.length} factures`} icon="file" tone="emerald" />
        <StatCard label="Encaissé" value={fcfa(totalPaye)} sub="Factures payées" icon="check" tone="sky" />
        <StatCard label="En attente" value={fcfa(totalImpaye)} sub="À recouvrer" icon="wallet" tone="amber" />
        <StatCard label="En retard" value={fcfa(totalRetard)} sub="Échéance dépassée" icon="alert" tone="rose" />
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
            <option value="envoyee">Envoyée</option>
            <option value="payee">Payée</option>
            <option value="retard">En retard</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-neutral-50/70 text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Facture</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Boutique</th>
                <th className="px-4 py-3 font-semibold">Échéance</th>
                <th className="px-4 py-3 text-right font-semibold">TVA</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Statut</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtrees.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon="file"
                      title="Aucune facture"
                      description="Créez votre première facture professionnelle avec TVA."
                      action={<Button icon="plus" onClick={ouvrirCreation}>Nouvelle facture</Button>}
                    />
                  </td>
                </tr>
              ) : (
                filtrees.map((f) => {
                  const st = statutEffectif(f);
                  return (
                    <tr key={f.id} className="hover:bg-neutral-50/60">
                      <td className="px-4 py-3">
                        <button onClick={() => setDetail(f)} className="font-semibold text-emerald-700 hover:underline">
                          {f.numero}
                        </button>
                        <p className="text-[11px] text-neutral-400">{formatDate(f.date)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-800">{f.clientNom}</p>
                        <p className="text-[11px] text-neutral-400">{f.clientTel ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{boutiqueNom(f.boutiqueId)}</td>
                      <td className="px-4 py-3 text-neutral-600">{formatDate(f.echeance)}</td>
                      <td className="px-4 py-3 text-right text-neutral-600">{fcfa(f.tva)}</td>
                      <td className="px-4 py-3 text-right font-bold text-neutral-900">{fcfa(f.total)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statutTone(st)}>{statutLabel(st)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {st !== "payee" ? (
                            <button
                              onClick={() => ouvrirPaiement(f)}
                              className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              Encaisser
                            </button>
                          ) : null}
                          <button
                            onClick={() => setASupprimer(f)}
                            className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="Supprimer"
                          >
                            <Icon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOuvert}
        onClose={() => setModalOuvert(false)}
        title="Nouvelle facture"
        description="La TVA est calculée automatiquement."
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOuvert(false)}>
              Annuler
            </Button>
            <Button icon="check" onClick={enregistrer}>
              Créer la facture
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Client</label>
            <input value={clientNom} onChange={(e) => setClientNom(e.target.value)} placeholder="Nom du client" className={inputClass} />
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
                <option key={b.id} value={b.id}>
                  {b.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Échéance</label>
            <input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="mt-5">
          <p className={labelClass}>Produits</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={produitSel} onChange={(e) => setProduitSel(e.target.value)} className={`${inputClass} flex-1`}>
              {produitsBoutique.length === 0 ? <option value="">Aucun produit</option> : null}
              {produitsBoutique.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} — {fcfa(p.prixVente)}
                </option>
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
            <Button variant="secondary" icon="plus" onClick={ajouterLigne}>
              Ajouter
            </Button>
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
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Facture ${detail.numero}` : "Facture"}
        description={detail ? boutiqueNom(detail.boutiqueId) : ""}
        wide
        footer={
          detail ? (
            <>
              <Button variant="secondary" onClick={() => setDetail(null)}>
                Fermer
              </Button>
              {detail.statut !== "payee" ? (
                <Button
                  icon="wallet"
                  onClick={() => {
                    ouvrirPaiement(detail);
                    setDetail(null);
                  }}
                >
                  Encaisser
                </Button>
              ) : null}
            </>
          ) : null
        }
      >
        {detail ? (
          <div>
            <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-neutral-50 p-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-neutral-400">Client</p>
                <p className="font-semibold text-neutral-900">{detail.clientNom}</p>
                <p className="text-xs text-neutral-500">{detail.clientTel ?? "—"}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-neutral-400">Échéance</p>
                <p className="font-semibold text-neutral-900">{formatDate(detail.echeance)}</p>
                <Badge tone={statutTone(statutEffectif(detail))}>{statutLabel(statutEffectif(detail))}</Badge>
              </div>
            </div>
            <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
              {detail.lignes.map((l, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-neutral-700">
                    {l.nom} <span className="text-neutral-400">×{l.quantite}</span>
                  </span>
                  <span className="font-semibold text-neutral-900">{fcfa(l.prixUnitaire * l.quantite)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between text-neutral-500">
                <span>Sous-total</span>
                <span>{fcfa(detail.sousTotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>TVA</span>
                <span>{fcfa(detail.tva)}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-1 text-base font-extrabold text-neutral-900">
                <span>Total</span>
                <span>{fcfa(detail.total)}</span>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!aPayer}
        onClose={() => setAPayer(null)}
        title="Encaisser la facture"
        description={aPayer ? `${aPayer.clientNom} · ${fcfa(aPayer.total)}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAPayer(null)}>
              Annuler
            </Button>
            <Button icon="check" onClick={confirmerPaiement}>
              Confirmer le paiement
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Opérateur</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOperateur("mtn_momo")}
                disabled={!state.parametres.operateurs.mtn}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-40 ${
                  operateur === "mtn_momo" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-neutral-200 text-neutral-600"
                }`}
              >
                MTN MoMo
              </button>
              <button
                onClick={() => setOperateur("orange_money")}
                disabled={!state.parametres.operateurs.orange}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-40 ${
                  operateur === "orange_money" ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-neutral-200 text-neutral-600"
                }`}
              >
                Orange Money
              </button>
            </div>
          </div>
          <div>
            <label className={labelClass}>Numéro de téléphone</label>
            <input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+237…" className={inputClass} />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
            <span className="text-sm text-neutral-500">Montant à encaisser</span>
            <span className="text-lg font-extrabold text-neutral-900">{aPayer ? fcfa(aPayer.total) : ""}</span>
          </div>
          <p className="text-[11px] text-neutral-400">Paiement simulé pour la démonstration (aucun débit réel).</p>
        </div>
      </Modal>

      <Modal
        open={!!aSupprimer}
        onClose={() => setASupprimer(null)}
        title="Supprimer la facture"
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
                if (aSupprimer) deleteFacture(aSupprimer.id);
                setASupprimer(null);
              }}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">
          Voulez-vous vraiment supprimer la facture{" "}
          <span className="font-semibold text-neutral-900">{aSupprimer?.numero}</span> ?
        </p>
      </Modal>
    </div>
  );
}
