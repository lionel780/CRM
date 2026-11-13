"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import type { Role, Utilisateur } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, StatCard, inputClass, labelClass } from "@/components/ui";
import { Icon } from "@/components/icons";

const formVide = { nom: "", identifiant: "", pin: "", role: "vendeur" as Role, boutiqueId: "" };

function libelleRole(role: Role): string {
  if (role === "super_admin") return "Super administrateur";
  if (role === "gerant") return "Gérant";
  return "Vendeur";
}

export default function UtilisateursPage() {
  const { state, addUtilisateur, updateUtilisateur, deleteUtilisateur } = useApp();
  const roleCourant = state.utilisateur?.role ?? "gerant";
  const estSuperAdmin = roleCourant === "super_admin";

  const [modalOuvert, setModalOuvert] = useState(false);
  const [form, setForm] = useState(formVide);
  const [erreur, setErreur] = useState("");
  const [pinOuvert, setPinOuvert] = useState(false);
  const [nouveauPin, setNouveauPin] = useState("");
  const [pinErreur, setPinErreur] = useState("");

  const utilisateurs = useMemo(
    () => [...state.utilisateurs].sort((a, b) => a.nom.localeCompare(b.nom)),
    [state.utilisateurs],
  );

  const total = utilisateurs.length;
  const actifs = utilisateurs.filter((u) => u.actif).length;
  const gerants = utilisateurs.filter((u) => u.role === "gerant").length;
  const vendeurs = utilisateurs.filter((u) => u.role === "vendeur").length;

  function ouvrirAjout() {
    setForm({
      ...formVide,
      role: estSuperAdmin ? "vendeur" : "vendeur",
      boutiqueId:
        state.boutiqueActiveId !== "all" ? state.boutiqueActiveId : state.boutiques[0]?.id ?? "",
    });
    setErreur("");
    setModalOuvert(true);
  }

  function enregistrer() {
    if (!form.nom.trim()) return setErreur("Le nom est obligatoire.");
    if (!form.identifiant.trim()) return setErreur("L'identifiant est obligatoire.");
    if (form.pin.trim().length < 4) return setErreur("Le PIN doit contenir au moins 4 caractères.");
    if (form.role === "vendeur" && !form.boutiqueId) {
      return setErreur("Sélectionnez la boutique du vendeur.");
    }
    addUtilisateur({
      nom: form.nom.trim(),
      identifiant: form.identifiant.trim(),
      pin: form.pin.trim(),
      role: estSuperAdmin ? form.role : "vendeur",
      boutiqueId: form.boutiqueId || undefined,
    });
    setModalOuvert(false);
  }

  function supprimer(u: Utilisateur) {
    if (!window.confirm(`Supprimer le compte de ${u.nom} ?`)) return;
    deleteUtilisateur(u.id);
  }

  function changerMonPin() {
    if (!state.utilisateur) return;
    if (nouveauPin.trim().length < 4) return setPinErreur("Le PIN doit contenir au moins 4 caractères.");
    updateUtilisateur(state.utilisateur.id, { pin: nouveauPin.trim() });
    setNouveauPin("");
    setPinErreur("");
    setPinOuvert(false);
  }

  return (
    <div>
      <PageHeader
        title="Utilisateurs & accès"
        subtitle={
          estSuperAdmin
            ? "Tous les comptes inscrits sur la plateforme, toutes boutiques confondues."
            : "Gérez les vendeurs de vos boutiques et leurs accès."
        }
        actions={
          <Button icon="plus" onClick={ouvrirAjout}>
            Nouvel utilisateur
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Comptes" value={`${total}`} sub="Toutes boutiques" icon="user" tone="emerald" />
        <StatCard label="Actifs" value={`${actifs}`} sub={`${total - actifs} désactivé(s)`} icon="check" tone="sky" />
        <StatCard label="Gérants" value={`${gerants}`} sub="Propriétaires de boutique" icon="store" tone="violet" />
        <StatCard label="Vendeurs" value={`${vendeurs}`} sub="Employés en caisse" icon="cart" tone="amber" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4 sm:px-5">
          <h2 className="text-sm font-bold text-neutral-900">Liste des comptes</h2>
          <Badge tone="neutral">{total} compte(s)</Badge>
        </div>

        {utilisateurs.length === 0 ? (
          <EmptyState
            icon="user"
            title="Aucun utilisateur"
            description="Créez un compte gérant ou vendeur pour commencer."
          />
        ) : (
          <div className="divide-y divide-neutral-100 border-t border-neutral-100">
            {utilisateurs.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[11px] font-bold text-white">
                  {u.nom.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">{u.nom}</p>
                  <p className="truncate text-xs text-neutral-500">
                    @{u.identifiant}
                    {u.boutiqueNom ? ` · ${u.boutiqueNom}` : " · Aucune boutique"}
                  </p>
                </div>

                <Badge
                  tone={u.role === "super_admin" ? "violet" : u.role === "gerant" ? "info" : "neutral"}
                >
                  {libelleRole(u.role)}
                </Badge>
                <Badge tone={u.actif ? "success" : "warning"}>{u.actif ? "Actif" : "Inactif"}</Badge>

                {u.id === state.utilisateur?.id ? (
                  <button
                    onClick={() => {
                      setPinErreur("");
                      setPinOuvert(true);
                    }}
                    className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50"
                  >
                    Changer mon PIN
                  </button>
                ) : u.role !== "super_admin" ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateUtilisateur(u.id, { actif: !u.actif })}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        u.actif
                          ? "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {u.actif ? "Désactiver" : "Activer"}
                    </button>
                    <button
                      onClick={() => supprimer(u)}
                      className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"
                      aria-label={`Supprimer ${u.nom}`}
                      title="Supprimer"
                    >
                      <Icon name="close" className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={modalOuvert}
        onClose={() => setModalOuvert(false)}
        title="Nouvel utilisateur"
        description={
          estSuperAdmin
            ? "Créez un gérant ou un vendeur et rattachez-le à une boutique."
            : "Ajoutez un vendeur à l'une de vos boutiques."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOuvert(false)}>
              Annuler
            </Button>
            <Button icon="check" onClick={enregistrer}>
              Créer le compte
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Nom complet</label>
            <input
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className={inputClass}
              placeholder="Ex : Alice Mbarga"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Identifiant</label>
              <input
                value={form.identifiant}
                onChange={(e) => setForm({ ...form, identifiant: e.target.value })}
                className={inputClass}
                placeholder="Ex : alice"
              />
            </div>
            <div>
              <label className={labelClass}>PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value })}
                className={inputClass}
                placeholder="••••"
              />
            </div>
          </div>

          {estSuperAdmin ? (
            <div>
              <label className={labelClass}>Rôle</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className={inputClass}
              >
                <option value="vendeur">Vendeur (caisse &amp; stock)</option>
                <option value="gerant">Gérant (propriétaire)</option>
              </select>
            </div>
          ) : null}

          <div>
            <label className={labelClass}>
              Boutique {form.role === "vendeur" ? "(obligatoire)" : "(optionnelle)"}
            </label>
            <select
              value={form.boutiqueId}
              onChange={(e) => setForm({ ...form, boutiqueId: e.target.value })}
              className={inputClass}
            >
              {form.role !== "vendeur" ? <option value="">Aucune boutique</option> : null}
              {state.boutiques.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nom}
                </option>
              ))}
            </select>
          </div>

          {erreur ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{erreur}</p>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={pinOuvert}
        onClose={() => setPinOuvert(false)}
        title="Changer mon PIN"
        description="Choisissez un nouveau code à 4 caractères minimum."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPinOuvert(false)}>
              Annuler
            </Button>
            <Button icon="check" onClick={changerMonPin}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div>
          <label className={labelClass}>Nouveau PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={nouveauPin}
            onChange={(e) => setNouveauPin(e.target.value)}
            className={inputClass}
            placeholder="••••"
          />
          {pinErreur ? (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{pinErreur}</p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
