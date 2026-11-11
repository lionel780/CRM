"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { fcfa, formatDate, formatHeure } from "@/lib/format";
import { whatsappUrl } from "@/lib/whatsapp";
import type { Client, Rappel } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { Icon } from "@/components/icons";

export default function RappelsPage() {
  const { state, creerRappel, envoyerRappel, genererRappels, deleteRappel } = useApp();
  const [info, setInfo] = useState("");
  const [filtre, setFiltre] = useState<"tous" | "en_attente" | "envoye">("tous");

  const clientsParId = useMemo(() => {
    const map = new Map<string, Client>();
    for (const c of state.clients) map.set(c.id, c);
    return map;
  }, [state.clients]);

  const endettés = useMemo(
    () => state.clients.filter((c) => c.dette > 0).sort((a, b) => b.dette - a.dette),
    [state.clients],
  );

  const rappels = useMemo(
    () => state.rappels.filter((r) => (filtre === "tous" ? true : r.statut === filtre)),
    [state.rappels, filtre],
  );

  const enAttente = state.rappels.filter((r) => r.statut === "en_attente");
  const envoyes = state.rappels.filter((r) => r.statut === "envoye");
  const totalEncours = endettés.reduce((s, c) => s + c.dette, 0);

  function dernierRappel(clientId: string) {
    return state.rappels.find((r) => r.clientId === clientId);
  }

  async function relancer(c: Client) {
    setInfo("");
    if (!c.telephone) {
      setInfo(`${c.nom} n'a pas de numéro de téléphone.`);
      return;
    }
    const r = await creerRappel(c.id);
    if (!r) return;
    window.open(whatsappUrl(c.telephone, r.message), "_blank", "noopener");
    await envoyerRappel(r.id);
    setInfo(`Rappel envoyé à ${c.nom} (${fcfa(r.montant)}).`);
  }

  async function envoyer(r: Rappel) {
    setInfo("");
    const c = clientsParId.get(r.clientId);
    if (!c?.telephone) {
      setInfo("Ce client n'a pas de numéro de téléphone.");
      return;
    }
    window.open(whatsappUrl(c.telephone, r.message), "_blank", "noopener");
    await envoyerRappel(r.id);
    setInfo(`Rappel marqué comme envoyé pour ${c.nom}.`);
  }

  async function generer() {
    await genererRappels();
    setInfo("Rappels automatiques générés pour les clients éligibles.");
  }

  return (
    <div>
      <PageHeader
        title="Rappels WhatsApp"
        subtitle="Relancez les clients endettés en un clic, manuellement ou automatiquement."
        actions={
          <Button icon="bell" variant="dark" onClick={generer}>
            Générer maintenant
          </Button>
        }
      />

      {info ? <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">{info}</p> : null}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Encours clients" value={fcfa(totalEncours)} sub={`${endettés.length} clients`} icon="wallet" tone="amber" />
        <StatCard label="Clients à relancer" value={`${endettés.length}`} sub="Solde supérieur à 0" icon="user" tone="rose" />
        <StatCard label="En attente" value={`${enAttente.length}`} sub="Rappels à envoyer" icon="bell" tone="sky" />
        <StatCard label="Envoyés" value={`${envoyes.length}`} sub="Historique total" icon="check" tone="emerald" />
      </div>

      <Card className="mb-4 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Icon name="spark" className="h-4 w-4" />
          </span>
          <div className="text-sm">
            <p className="font-semibold text-neutral-800">
              Rappels automatiques {state.parametres.rappelAuto ? "activés" : "désactivés"}
            </p>
            <p className="mt-0.5 text-neutral-500">
              {state.parametres.rappelAuto
                ? `Un rappel est généré tous les ${state.parametres.rappelJours} jours pour chaque client endetté avec téléphone.`
                : "Activez les rappels automatiques dans les paramètres pour ne plus oublier une relance."}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
            <h2 className="text-sm font-bold text-neutral-900">Clients à relancer</h2>
            <Badge tone="warning">{endettés.length}</Badge>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {endettés.length === 0 ? (
              <EmptyState icon="check" title="Aucune dette" description="Tous vos clients sont à jour." />
            ) : (
              <div className="divide-y divide-neutral-100">
                {endettés.map((c) => {
                  const der = dernierRappel(c.id);
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-bold text-amber-700">
                        {c.nom.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-800">{c.nom}</p>
                        <p className="truncate text-[11px] text-neutral-400">
                          {c.telephone ?? "Sans téléphone"}
                          {der ? ` · dernier rappel ${formatDate(der.date)}` : " · jamais relancé"}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-amber-700">{fcfa(c.dette)}</span>
                      <button
                        onClick={() => relancer(c)}
                        disabled={!c.telephone}
                        className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                      >
                        WhatsApp
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-neutral-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-neutral-900">Journal des rappels</h2>
            <select
              value={filtre}
              onChange={(e) => setFiltre(e.target.value as typeof filtre)}
              className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-neutral-700 outline-none focus:border-emerald-500"
            >
              <option value="tous">Tous</option>
              <option value="en_attente">En attente</option>
              <option value="envoye">Envoyés</option>
            </select>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {rappels.length === 0 ? (
              <EmptyState icon="bell" title="Aucun rappel" description="Générez ou envoyez un rappel WhatsApp." />
            ) : (
              <div className="divide-y divide-neutral-100">
                {rappels.map((r) => {
                  const c = clientsParId.get(r.clientId);
                  return (
                    <div key={r.id} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={r.statut === "envoye" ? "success" : "warning"}>
                          {r.statut === "envoye" ? "Envoyé" : "En attente"}
                        </Badge>
                        <Badge tone={r.type === "auto" ? "info" : "neutral"}>
                          {r.type === "auto" ? "Auto" : "Manuel"}
                        </Badge>
                        <span className="text-[11px] text-neutral-400">
                          {formatDate(r.date)} · {formatHeure(r.date)}
                        </span>
                        <span className="ml-auto text-sm font-bold text-neutral-900">{fcfa(r.montant)}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-neutral-800">{c?.nom ?? "Client supprimé"}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{r.message}</p>
                      <div className="mt-2 flex items-center gap-2">
                        {r.statut === "en_attente" ? (
                          <button
                            onClick={() => envoyer(r)}
                            disabled={!c?.telephone}
                            className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                          >
                            Ouvrir WhatsApp + marquer envoyé
                          </button>
                        ) : (
                          <a
                            href={c?.telephone ? whatsappUrl(c.telephone, r.message) : "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg bg-neutral-100 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-200"
                          >
                            Renvoyer
                          </a>
                        )}
                        <button
                          onClick={() => deleteRappel(r.id)}
                          className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Supprimer"
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
