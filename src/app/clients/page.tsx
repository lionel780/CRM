"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { fcfa, formatDate } from "@/lib/format";
import type { Client } from "@/lib/types";
import { whatsappUrl } from "@/lib/whatsapp";
import {
  Badge,
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

type FormClient = { id?: string; nom: string; telephone: string; email: string; adresse: string };
const formVide: FormClient = { nom: "", telephone: "", email: "", adresse: "" };

export default function ClientsPage() {
  const { state, addClient, updateClient, deleteClient, creerRappel, envoyerRappel: marquerEnvoye } = useApp();
  const [recherche, setRecherche] = useState("");
  const [form, setForm] = useState<FormClient>(formVide);
  const [modalOuvert, setModalOuvert] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState<Client | null>(null);
  const [erreur, setErreur] = useState("");
  const [info, setInfo] = useState("");

  const clients = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return state.clients
      .filter((c) => !q || c.nom.toLowerCase().includes(q) || (c.telephone ?? "").includes(q))
      .sort((a, b) => b.dette - a.dette || a.nom.localeCompare(b.nom));
  }, [state.clients, recherche]);

  const totalDette = state.clients.reduce((s, c) => s + c.dette, 0);
  const endettes = state.clients.filter((c) => c.dette > 0).length;
  const rappelsEnAttente = state.rappels.filter((r) => r.statut === "en_attente").length;

  const detail = state.clients.find((c) => c.id === detailId) ?? null;

  function ouvrirAjout() {
    setForm(formVide);
    setErreur("");
    setModalOuvert(true);
  }

  function ouvrirEdition(c: Client) {
    setForm({ id: c.id, nom: c.nom, telephone: c.telephone ?? "", email: c.email ?? "", adresse: c.adresse ?? "" });
    setErreur("");
    setModalOuvert(true);
  }

  async function enregistrer() {
    if (!form.nom.trim()) return setErreur("Le nom du client est obligatoire.");
    if (form.id) {
      await updateClient(form.id, {
        nom: form.nom.trim(),
        telephone: form.telephone.trim(),
        email: form.email.trim(),
        adresse: form.adresse.trim(),
      });
    } else {
      await addClient({
        nom: form.nom.trim(),
        telephone: form.telephone.trim() || undefined,
        email: form.email.trim() || undefined,
        adresse: form.adresse.trim() || undefined,
      });
    }
    setModalOuvert(false);
  }

  async function envoyerRappel(c: Client) {
    setErreur("");
    setInfo("");
    if (!c.telephone) {
      setErreur("Ce client n'a pas de numéro de téléphone.");
      return;
    }
    const rappel = await creerRappel(c.id);
    if (!rappel) return;
    window.open(whatsappUrl(c.telephone, rappel.message), "_blank", "noopener");
    await marquerEnvoye(rappel.id);
    setInfo(`Rappel WhatsApp prêt pour ${c.nom}.`);
  }

  const facturesDetail = detail ? state.factures.filter((f) => f.clientId === detail.id) : [];
  const ventesDetail = detail ? state.ventes.filter((v) => v.clientId === detail.id) : [];
  const rappelsDetail = detail ? state.rappels.filter((r) => r.clientId === detail.id) : [];
  const impayesDetail = [
    ...facturesDetail
      .filter((f) => f.statut !== "payee")
      .map((f) => ({ id: f.id, type: "Facture", numero: f.numero, date: f.date, total: f.total, statut: f.statut })),
    ...ventesDetail
      .filter((v) => v.statut === "credit")
      .map((v) => ({ id: v.id, type: "Vente", numero: v.numero, date: v.date, total: v.total, statut: "credit" })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <PageHeader
        title="Clients & dettes"
        subtitle="Fiche client, historique de dette et rappels WhatsApp."
        actions={<Button icon="plus" onClick={ouvrirAjout}>Nouveau client</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Clients" value={`${state.clients.length}`} sub="Fiches enregistrées" icon="user" tone="emerald" />
        <StatCard label="Encours total" value={fcfa(totalDette)} sub="Dettes à recouvrer" icon="wallet" tone="amber" />
        <StatCard label="Clients endettés" value={`${endettes}`} sub="Solde supérieur à 0" icon="alert" tone="rose" />
        <StatCard label="Rappels en attente" value={`${rappelsEnAttente}`} sub="À envoyer sur WhatsApp" icon="bell" tone="sky" />
      </div>

      {erreur ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{erreur}</p> : null}
      {info ? <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{info}</p> : null}

      <Card className="overflow-hidden">
        <div className="border-b border-neutral-100 p-4">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un client ou un téléphone…"
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-neutral-50/70 text-[11px] uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Téléphone</th>
                <th className="px-4 py-3 text-right font-semibold">Dette</th>
                <th className="px-4 py-3 font-semibold">Créé le</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      icon="user"
                      title="Aucun client"
                      description="Créez une fiche client pour suivre ses achats et ses dettes."
                      action={<Button icon="plus" onClick={ouvrirAjout}>Nouveau client</Button>}
                    />
                  </td>
                </tr>
              ) : (
                clients.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50/60">
                    <td className="px-4 py-3">
                      <button onClick={() => setDetailId(c.id)} className="text-left">
                        <p className="font-semibold text-neutral-800 hover:text-emerald-700">{c.nom}</p>
                        <p className="text-[11px] text-neutral-400">{c.email ?? c.adresse ?? "—"}</p>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{c.telephone ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {c.dette > 0 ? (
                        <span className="font-bold text-amber-700">{fcfa(c.dette)}</span>
                      ) : (
                        <Badge tone="success">À jour</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => ouvrirEdition(c)}
                          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                          aria-label="Modifier"
                        >
                          <Icon name="edit" className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => envoyerRappel(c)}
                          disabled={!c.telephone || c.dette <= 0}
                          className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                        >
                          Rappel
                        </button>
                        <button
                          onClick={() => setASupprimer(c)}
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
        title={form.id ? "Modifier le client" : "Nouveau client"}
        description="La fiche alimente l'historique de dette et les rappels."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOuvert(false)}>Annuler</Button>
            <Button icon="check" onClick={enregistrer}>Enregistrer</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nom</label>
            <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className={inputClass} placeholder="Nom du client" />
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className={inputClass} placeholder="+237…" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="Optionnel" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Adresse</label>
            <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className={inputClass} placeholder="Quartier, ville…" />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetailId(null)}
        title={detail ? detail.nom : "Client"}
        description={detail ? `${detail.telephone ?? "Sans téléphone"} · ${detail.email ?? "Sans email"}` : ""}
        wide
        footer={
          detail ? (
            <>
              <Button variant="secondary" onClick={() => setDetailId(null)}>Fermer</Button>
              <Button
                icon="phone"
                onClick={() => envoyerRappel(detail)}
                disabled={!detail.telephone || detail.dette <= 0}
              >
                Rappel WhatsApp
              </Button>
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Dette totale</p>
                <p className="mt-1 text-xl font-extrabold text-amber-800">{fcfa(detail.dette)}</p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Adresse</p>
                <p className="mt-1 text-sm font-semibold text-neutral-800">{detail.adresse ?? "—"}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-neutral-900">Historique de dette</h3>
              <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                {impayesDetail.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-neutral-400">Aucun impayé.</p>
                ) : (
                  impayesDetail.map((d) => (
                    <div key={`${d.type}-${d.id}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                      <Badge tone={d.type === "Facture" ? "info" : "warning"}>{d.type}</Badge>
                      <span className="flex-1 font-semibold text-neutral-800">{d.numero}</span>
                      <span className="text-xs text-neutral-500">{formatDate(d.date)}</span>
                      <span className="w-24 text-right font-bold text-neutral-900">{fcfa(d.total)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-bold text-neutral-900">Rappels</h3>
              <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                {rappelsDetail.length === 0 ? (
                  <p className="px-3 py-6 text-center text-sm text-neutral-400">Aucun rappel envoyé.</p>
                ) : (
                  rappelsDetail.slice(0, 6).map((r) => (
                    <div key={r.id} className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Badge tone={r.statut === "envoye" ? "success" : "warning"}>
                          {r.statut === "envoye" ? "Envoyé" : "En attente"}
                        </Badge>
                        <span className="text-xs text-neutral-500">{formatDate(r.date)}</span>
                        <span className="ml-auto text-sm font-bold text-neutral-900">{fcfa(r.montant)}</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">{r.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!aSupprimer}
        onClose={() => setASupprimer(null)}
        title="Supprimer le client"
        description="Les ventes et factures liées seront conservées."
        footer={
          <>
            <Button variant="secondary" onClick={() => setASupprimer(null)}>Annuler</Button>
            <Button
              variant="danger"
              icon="trash"
              onClick={() => {
                if (aSupprimer) deleteClient(aSupprimer.id);
                setASupprimer(null);
              }}
            >
              Supprimer
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">
          Supprimer la fiche de <span className="font-semibold text-neutral-900">{aSupprimer?.nom}</span> ?
        </p>
      </Modal>
    </div>
  );
}
