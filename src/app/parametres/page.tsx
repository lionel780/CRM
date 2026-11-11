"use client";

import { useState, type ChangeEvent } from "react";
import { useApp } from "@/lib/store";
import { Badge, Button, Card, Modal, PageHeader, inputClass, labelClass } from "@/components/ui";
import { Icon } from "@/components/icons";

function Switch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-emerald-600" : "bg-neutral-300"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`}
      />
    </button>
  );
}

function lireImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 320;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Image illisible."));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

export default function ParametresPage() {
  const { state, updateParametres, resetDemo } = useApp();
  const p = state.parametres;
  const [confirmReset, setConfirmReset] = useState(false);
  const [logoErreur, setLogoErreur] = useState("");

  async function chargerLogo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoErreur("");
    if (!file.type.startsWith("image/")) {
      setLogoErreur("Choisissez une image PNG ou JPG.");
      return;
    }
    if (file.size > 4_000_000) {
      setLogoErreur("L'image ne doit pas dépasser 4 Mo.");
      return;
    }
    try {
      const data = await lireImage(file);
      await updateParametres({ logo: data });
    } catch (err) {
      setLogoErreur(err instanceof Error ? err.message : "Impossible de charger l'image.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Paramètres"
        subtitle="Configurez votre entreprise, la TVA et les moyens de paiement."
        actions={<Badge tone="success"><Icon name="check" className="h-3 w-3" /> Enregistrement automatique</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon name="store" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Profil de l&apos;entreprise</h2>
              <p className="text-xs text-neutral-500">Ces informations figurent sur vos documents.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Nom de l&apos;entreprise</label>
              <input
                value={p.entreprise}
                onChange={(e) => updateParametres({ entreprise: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Ville</label>
                <input value={p.ville} onChange={(e) => updateParametres({ ville: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Téléphone</label>
                <input
                  value={p.telephone}
                  onChange={(e) => updateParametres({ telephone: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Devise</label>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2.5">
                <span className="text-sm font-medium text-neutral-700">Franc CFA (FCFA)</span>
                <Badge tone="info">CEMAC</Badge>
              </div>
            </div>
            <div>
              <label className={labelClass}>Logo</label>
              <div className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-50">
                  {p.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logo} alt="Logo de l'entreprise" className="h-full w-full object-contain" />
                  ) : (
                    <Icon name="store" className="h-6 w-6 text-neutral-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-neutral-500">PNG ou JPG, redimensionné automatiquement.</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-neutral-100 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-200">
                      Choisir une image
                      <input type="file" accept="image/png,image/jpeg" onChange={chargerLogo} className="hidden" />
                    </label>
                    {p.logo ? (
                      <button
                        onClick={() => updateParametres({ logo: undefined })}
                        className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                      >
                        Retirer
                      </button>
                    ) : null}
                  </div>
                  {logoErreur ? <p className="mt-1.5 text-[11px] font-medium text-red-600">{logoErreur}</p> : null}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Icon name="file" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Facturation &amp; taxes</h2>
              <p className="text-xs text-neutral-500">Taux appliqué automatiquement aux factures.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Taux de TVA (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.25"
                  value={p.tva}
                  onChange={(e) => updateParametres({ tva: Number(e.target.value) || 0 })}
                  className={`${inputClass} pr-10`}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400">%</span>
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-400">Taux standard au Cameroun : 19,25 %.</p>
            </div>
            <div className="rounded-xl bg-emerald-50/70 p-3 text-xs text-emerald-800">
              <p className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0" />
                Les factures calculent le sous-total, la TVA et le total automatiquement.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Icon name="bell" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Rappels WhatsApp</h2>
              <p className="text-xs text-neutral-500">Relancez automatiquement les clients endettés.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-3.5 py-3">
              <div>
                <p className="text-sm font-semibold text-neutral-800">Rappels automatiques</p>
                <p className="text-[11px] text-neutral-400">Génère un rappel à intervalle régulier.</p>
              </div>
              <Switch checked={p.rappelAuto} onChange={() => updateParametres({ rappelAuto: !p.rappelAuto })} />
            </div>
            <div>
              <label className={labelClass}>Intervalle (jours)</label>
              <input
                type="number"
                min={1}
                value={p.rappelJours}
                disabled={!p.rappelAuto}
                onChange={(e) => updateParametres({ rappelJours: Math.max(1, Number(e.target.value) || 1) })}
                className={`${inputClass} disabled:bg-neutral-50 disabled:text-neutral-400`}
              />
              <p className="mt-1.5 text-[11px] text-neutral-400">
                Délai minimum entre deux rappels pour un même client.
              </p>
            </div>
            <div>
              <label className={labelClass}>Modèle du message</label>
              <textarea
                value={p.whatsappModele ?? ""}
                onChange={(e) => updateParametres({ whatsappModele: e.target.value })}
                rows={4}
                className={`${inputClass} resize-none`}
                placeholder="Bonjour {client}, votre solde chez {entreprise} est de {montant} FCFA."
              />
              <p className="mt-1.5 text-[11px] text-neutral-400">
                Variables : <span className="font-semibold">{"{client}"}</span>,{" "}
                <span className="font-semibold">{"{entreprise}"}</span>,{" "}
                <span className="font-semibold">{"{montant}"}</span>.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Icon name="phone" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Paiements Mobile Money</h2>
              <p className="text-xs text-neutral-500">Activez les opérateurs disponibles en caisse.</p>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-3.5 py-3">
              <div>
                <p className="text-sm font-semibold text-neutral-800">MTN Mobile Money</p>
                <p className="text-[11px] text-neutral-400">MoMo — paiement marchand</p>
              </div>
              <Switch
                checked={p.operateurs.mtn}
                onChange={() => updateParametres({ operateurs: { ...p.operateurs, mtn: !p.operateurs.mtn } })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-3.5 py-3">
              <div>
                <p className="text-sm font-semibold text-neutral-800">Orange Money</p>
                <p className="text-[11px] text-neutral-400">Orange Money — paiement marchand</p>
              </div>
              <Switch
                checked={p.operateurs.orange}
                onChange={() => updateParametres({ operateurs: { ...p.operateurs, orange: !p.operateurs.orange } })}
              />
            </div>
            <p className="rounded-lg bg-neutral-50 px-3 py-2 text-[11px] text-neutral-500">
              Intégration simulée pour la démo. En production, la connexion se fait via un agrégateur agréé COBAC/BEAC.
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Icon name="alert" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Données de démonstration</h2>
              <p className="text-xs text-neutral-500">Les données sont stockées dans la base SQLite locale.</p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-neutral-500">
            Réinitialisez les boutiques, produits, ventes et factures pour repartir de la démo d&apos;origine.
            Vos modifications locales seront perdues.
          </p>
          <Button variant="danger" icon="trash" className="mt-3" onClick={() => setConfirmReset(true)}>
            Réinitialiser la démo
          </Button>

          <div className="mt-5 border-t border-neutral-100 pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Version</span>
              <span className="font-semibold text-neutral-800">Boutika MVP 0.1</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-neutral-500">Boutiques</span>
              <span className="font-semibold text-neutral-800">{state.boutiques.length}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-neutral-500">Produits</span>
              <span className="font-semibold text-neutral-800">{state.produits.length}</span>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Réinitialiser la démo"
        description="Toutes les modifications locales seront effacées."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              icon="trash"
              onClick={() => {
                resetDemo();
                setConfirmReset(false);
              }}
            >
              Réinitialiser
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-600">
          Voulez-vous vraiment restaurer les données de démonstration d&apos;origine ?
        </p>
      </Modal>
    </div>
  );
}
