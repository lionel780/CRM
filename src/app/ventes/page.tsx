"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { fcfa, formatDate, formatHeure } from "@/lib/format";
import type { ModePaiement, Vente } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Modal, inputClass, labelClass } from "@/components/ui";
import { Icon } from "@/components/icons";
import {
  bluetoothDisponible,
  printTicketBluetooth,
  printTicketNavigateur,
  type TicketData,
} from "@/lib/bluetooth-printer";

const MODES: { value: ModePaiement; label: string; icon: "cash" | "phone" | "file"; sub: string }[] = [
  { value: "espece", label: "Espèces", icon: "cash", sub: "Paiement comptant" },
  { value: "mtn_momo", label: "MTN MoMo", icon: "phone", sub: "Mobile Money" },
  { value: "orange_money", label: "Orange Money", icon: "phone", sub: "Mobile Money" },
  { value: "credit", label: "Crédit", icon: "file", sub: "À encaisser plus tard" },
];

export default function VentesPage() {
  const { state, creerVente, erreur } = useApp();
  const boutiquesActives = useMemo(() => state.boutiques.filter((b) => b.actif), [state.boutiques]);

  const [boutiqueId, setBoutiqueId] = useState(() =>
    state.boutiqueActiveId !== "all" ? state.boutiqueActiveId : boutiquesActives[0]?.id ?? "",
  );
  const [recherche, setRecherche] = useState("");
  const [categorie, setCategorie] = useState("Toutes");
  const [panier, setPanier] = useState<Record<string, number>>({});
  const [mode, setMode] = useState<ModePaiement>("espece");
  const [clientId, setClientId] = useState("");
  const [clientNom, setClientNom] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [receipt, setReceipt] = useState<Vente | null>(null);
  const [impression, setImpression] = useState<{ type: "info" | "erreur"; texte: string } | null>(null);

  const boutique = state.boutiques.find((b) => b.id === boutiqueId);

  const produits = useMemo(
    () => state.produits.filter((p) => p.boutiqueId === boutiqueId),
    [state.produits, boutiqueId],
  );

  const categories = useMemo(
    () => ["Toutes", ...Array.from(new Set(produits.map((p) => p.categorie)))],
    [produits],
  );

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return produits.filter((p) => {
      const okCat = categorie === "Toutes" || p.categorie === categorie;
      const okQ = !q || p.nom.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      return okCat && okQ;
    });
  }, [produits, recherche, categorie]);

  const lignes = useMemo(
    () =>
      Object.entries(panier).flatMap(([id, qte]) => {
        const produit = state.produits.find((p) => p.id === id);
        return produit && produit.boutiqueId === boutiqueId && qte > 0 ? [{ produit, qte }] : [];
      }),
    [panier, state.produits, boutiqueId],
  );

  const total = lignes.reduce((s, l) => s + l.produit.prixVente * l.qte, 0);
  const articleCount = lignes.reduce((s, l) => s + l.qte, 0);

  function ajouter(id: string) {
    const p = state.produits.find((x) => x.id === id);
    if (!p || p.stock <= 0) return;
    setPanier((prev) => {
      const cur = prev[id] ?? 0;
      if (cur >= p.stock) return prev;
      return { ...prev, [id]: cur + 1 };
    });
  }

  function retirer(id: string) {
    setPanier((prev) => {
      const cur = prev[id] ?? 0;
      if (cur <= 1) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: cur - 1 };
    });
  }

  function vider() {
    setPanier({});
    setClientId("");
    setClientNom("");
    setClientTel("");
  }

  async function encaisser() {
    if (lignes.length === 0 || !boutique) return;
    const vente = await creerVente({
      boutiqueId,
      lignes: lignes.map((l) => ({
        produitId: l.produit.id,
        nom: l.produit.nom,
        prixUnitaire: l.produit.prixVente,
        quantite: l.qte,
      })),
      modePaiement: mode,
      clientId: clientId || undefined,
      clientNom: clientNom.trim() || undefined,
      clientTel: clientTel.trim() || undefined,
    });
    if (!vente) return;
    setReceipt(vente);
    setImpression(null);
    setPanier({});
    setClientId("");
    setClientNom("");
    setClientTel("");
  }

  function ticketDe(vente: Vente): TicketData {
    return {
      entreprise: state.parametres.entreprise,
      ville: state.parametres.ville,
      telephone: state.parametres.telephone,
      boutique: boutique?.nom ?? "",
      numero: vente.numero,
      date: vente.date,
      lignes: vente.lignes.map((l) => ({ nom: l.nom, quantite: l.quantite, prixUnitaire: l.prixUnitaire })),
      total: vente.total,
      mode: modeLabel(vente.modePaiement),
      client: vente.clientNom,
      clientTel: vente.clientTel,
    };
  }

  async function imprimerBluetooth(vente: Vente) {
    setImpression(null);
    try {
      const nom = await printTicketBluetooth(ticketDe(vente));
      setImpression({ type: "info", texte: `Ticket envoyé à ${nom}.` });
    } catch (e) {
      setImpression({
        type: "erreur",
        texte: e instanceof Error ? e.message : "Impression Bluetooth impossible.",
      });
    }
  }

  function imprimerNavigateur(vente: Vente) {
    setImpression(null);
    try {
      printTicketNavigateur(ticketDe(vente));
    } catch (e) {
      setImpression({ type: "erreur", texte: e instanceof Error ? e.message : "Impression impossible." });
    }
  }

  const ventesRecentes = useMemo(
    () =>
      state.ventes
        .filter((v) => v.boutiqueId === boutiqueId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 8),
    [state.ventes, boutiqueId],
  );

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl">Caisse / Ventes</h1>
          <p className="mt-1 text-sm text-neutral-500">Encaissez rapidement et mettez à jour le stock en temps réel.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="store" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <select
              value={boutiqueId}
              onChange={(e) => {
                setBoutiqueId(e.target.value);
                setPanier({});
              }}
              className="appearance-none rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-9 text-sm font-semibold text-neutral-700 outline-none focus:border-emerald-500"
            >
              {boutiquesActives.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nom}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher un produit ou un code…"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategorie(c)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    categorie === c
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="mt-3 grid max-h-[calc(100vh-290px)] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3">
              {filtres.length === 0 ? (
                <div className="col-span-full">
                  <EmptyState icon="box" title="Aucun produit" description="Ajoutez des produits dans la section Stock." />
                </div>
              ) : (
                filtres.map((p) => {
                  const qte = panier[p.id] ?? 0;
                  const rupture = p.stock <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => ajouter(p.id)}
                      disabled={rupture}
                      className={`group relative flex flex-col rounded-xl border p-3 text-left transition ${
                        rupture
                          ? "cursor-not-allowed border-neutral-100 bg-neutral-50 opacity-60"
                          : qte > 0
                            ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500"
                            : "border-neutral-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                      }`}
                    >
                      {qte > 0 ? (
                        <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[11px] font-bold text-white">
                          {qte}
                        </span>
                      ) : null}
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{p.categorie}</span>
                      <span className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-neutral-800">{p.nom}</span>
                      <span className="mt-auto pt-2 text-sm font-bold text-neutral-900">{fcfa(p.prixVente)}</span>
                      <span className={`mt-0.5 text-[11px] ${rupture ? "font-semibold text-red-600" : "text-neutral-500"}`}>
                        {rupture ? "Rupture de stock" : `${p.stock} ${p.unite} en stock`}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="sticky top-20 overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Icon name="cart" className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-neutral-900">Panier</h2>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                  {articleCount}
                </span>
              </div>
              {lignes.length > 0 ? (
                <button onClick={vider} className="text-xs font-semibold text-red-600 hover:text-red-700">
                  Vider
                </button>
              ) : null}
            </div>

            <div className="max-h-[280px] overflow-y-auto">
              {lignes.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
                    <Icon name="cart" className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-neutral-600">Panier vide</p>
                  <p className="mt-0.5 text-xs text-neutral-400">Touchez un produit pour l&apos;ajouter.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {lignes.map(({ produit, qte }) => (
                    <div key={produit.id} className="flex items-center gap-2 px-4 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-neutral-800">{produit.nom}</p>
                        <p className="text-[11px] text-neutral-500">{fcfa(produit.prixVente)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => retirer(produit.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                          aria-label="Retirer"
                        >
                          <span className="text-sm leading-none">−</span>
                        </button>
                        <span className="w-5 text-center text-xs font-bold">{qte}</span>
                        <button
                          onClick={() => ajouter(produit.id)}
                          disabled={qte >= produit.stock}
                          className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
                          aria-label="Ajouter"
                        >
                          <span className="text-sm leading-none">+</span>
                        </button>
                      </div>
                      <span className="w-16 text-right text-xs font-bold text-neutral-900">
                        {fcfa(produit.prixVente * qte)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-neutral-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-neutral-500">Total à payer</span>
                <span className="text-lg font-extrabold text-neutral-900">{fcfa(total)}</span>
              </div>

              <p className={labelClass}>Mode de paiement</p>
              <div className="grid grid-cols-3 gap-1.5">
                {MODES.filter((m) => m.value !== "credit").map((m) => {
                  const desactive =
                    (m.value === "mtn_momo" && !state.parametres.operateurs.mtn) ||
                    (m.value === "orange_money" && !state.parametres.operateurs.orange);
                  return (
                    <button
                      key={m.value}
                      onClick={() => setMode(m.value)}
                      disabled={desactive}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition disabled:opacity-40 ${
                        mode === m.value
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-1 ring-emerald-500"
                          : "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <Icon name={m.icon} className="h-5 w-5" />
                      <span className="text-[11px] font-bold leading-tight">{m.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setMode("credit")}
                className={`mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  mode === "credit"
                    ? "border-amber-500 bg-amber-50 text-amber-800 ring-1 ring-amber-500"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <Icon name="file" className="h-4 w-4" /> Vente à crédit
              </button>

              <div className="mt-3 grid grid-cols-1 gap-2">
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
                  <option value="">Client comptoir (optionnel)</option>
                  {state.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                      {c.dette > 0 ? ` — dette ${fcfa(c.dette)}` : ""}
                    </option>
                  ))}
                </select>
                <input
                  value={clientNom}
                  onChange={(e) => {
                    setClientNom(e.target.value);
                    setClientId("");
                  }}
                  placeholder={mode === "credit" ? "Nom du client (crédit)" : "Nom du client (optionnel)"}
                  className={inputClass}
                />
                {(mode === "mtn_momo" || mode === "orange_money" || mode === "credit" || clientNom) && (
                  <input
                    value={clientTel}
                    onChange={(e) => {
                      setClientTel(e.target.value);
                      setClientId("");
                    }}
                    placeholder="Téléphone (+237…)"
                    className={inputClass}
                  />
                )}
              </div>

              {erreur ? (
                <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{erreur}</p>
              ) : null}
              <Button
                onClick={encaisser}
                disabled={lignes.length === 0}
                className="mt-3 w-full py-3 text-base"
                icon="check"
              >
                Encaisser {fcfa(total)}
              </Button>
              {mode !== "espece" && lignes.length > 0 ? (
                <p className="mt-2 text-center text-[11px] text-neutral-400">
                  Paiement {mode === "credit" ? "à crédit enregistré" : "Mobile Money simulé pour la démo"}.
                </p>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4 sm:px-5">
          <h2 className="text-sm font-bold text-neutral-900">Ventes récentes</h2>
          <span className="text-xs text-neutral-500">{boutique?.nom}</span>
        </div>
        <div className="overflow-x-auto border-t border-neutral-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-neutral-50/70 text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-semibold">N°</th>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Articles</th>
                <th className="px-4 py-2.5 font-semibold">Paiement</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {ventesRecentes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                    Aucune vente pour cette boutique.
                  </td>
                </tr>
              ) : (
                ventesRecentes.map((v) => (
                  <tr key={v.id} className="hover:bg-neutral-50/60">
                    <td className="px-4 py-2.5 font-semibold text-neutral-800">{v.numero}</td>
                    <td className="px-4 py-2.5 text-neutral-500">
                      {formatDate(v.date)} · {formatHeure(v.date)}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-600">{v.lignes.reduce((s, l) => s + l.quantite, 0)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={v.statut === "credit" ? "warning" : "success"}>
                        {modeLabel(v.modePaiement)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-neutral-900">{fcfa(v.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!receipt}
        onClose={() => setReceipt(null)}
        title="Vente enregistrée"
        description="Le stock a été mis à jour automatiquement."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReceipt(null)}>
              Fermer
            </Button>
            {receipt ? (
              <>
                <a
                  href={`/api/ventes/${receipt.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  <Icon name="download" className="h-4 w-4" /> PDF
                </a>
                <Button variant="secondary" icon="spark" onClick={() => imprimerNavigateur(receipt)}>
                  Ticket
                </Button>
                {bluetoothDisponible() ? (
                  <Button variant="dark" icon="spark" onClick={() => imprimerBluetooth(receipt)}>
                    Bluetooth
                  </Button>
                ) : null}
                <a
                  href={whatsappLink(receipt)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <Icon name="phone" className="h-4 w-4" /> Envoyer
                </a>
              </>
            ) : null}
          </>
        }
      >
        {receipt ? (
          <div>
            <Recu vente={receipt} boutiqueNom={boutique?.nom ?? ""} />
            {impression ? (
              <p
                className={`mt-3 rounded-lg px-3 py-2 text-xs font-medium ${
                  impression.type === "erreur"
                    ? "bg-red-50 text-red-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {impression.texte}
              </p>
            ) : null}
            {!bluetoothDisponible() ? (
              <p className="mt-3 rounded-lg bg-neutral-50 px-3 py-2 text-[11px] text-neutral-500">
                Impression Bluetooth non disponible sur ce navigateur (utilisez Chrome/Edge). Le bouton « Ticket »
                ouvre l&apos;impression 80 mm.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function modeLabel(mode: ModePaiement): string {
  return mode === "espece"
    ? "Espèces"
    : mode === "mtn_momo"
      ? "MTN MoMo"
      : mode === "orange_money"
        ? "Orange Money"
        : "Crédit";
}

function whatsappLink(vente: Vente): string {
  const digits = (vente.clientTel ?? "").replace(/\D/g, "");
  const message = `Reçu ${vente.numero}\nTotal : ${fcfa(vente.total)}\nMerci pour votre achat !`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function Recu({ vente, boutiqueNom }: { vente: Vente; boutiqueNom: string }) {
  return (
    <div>
      <div className="mb-4 flex items-start justify-between rounded-xl bg-emerald-50 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Reçu</p>
          <p className="mt-1 text-lg font-extrabold text-neutral-900">{vente.numero}</p>
          <p className="text-xs text-neutral-500">
            {formatDate(vente.date)} · {formatHeure(vente.date)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-500">{boutiqueNom}</p>
          <p className="text-xl font-extrabold text-emerald-700">{fcfa(vente.total)}</p>
          <Badge tone={vente.statut === "credit" ? "warning" : "success"}>{modeLabel(vente.modePaiement)}</Badge>
        </div>
      </div>

      <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
        {vente.lignes.map((l, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-neutral-700">
              {l.nom} <span className="text-neutral-400">×{l.quantite}</span>
            </span>
            <span className="font-semibold text-neutral-900">{fcfa(l.prixUnitaire * l.quantite)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between text-neutral-500">
          <span>Client</span>
          <span className="font-medium text-neutral-800">{vente.clientNom ?? "Client comptoir"}</span>
        </div>
        <div className="flex justify-between text-neutral-500">
          <span>Total</span>
          <span className="text-base font-extrabold text-neutral-900">{fcfa(vente.total)}</span>
        </div>
      </div>
    </div>
  );
}
