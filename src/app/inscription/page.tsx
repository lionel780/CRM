"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Button, inputClass, labelClass } from "@/components/ui";

const formVide = {
  nom: "",
  identifiant: "",
  pin: "",
  boutiqueNom: "",
  ville: "Douala",
  adresse: "",
  telephone: "",
};

export default function InscriptionPage() {
  const router = useRouter();
  const [form, setForm] = useState(formVide);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  function champ<K extends keyof typeof formVide>(cle: K, valeur: string) {
    setForm((f) => ({ ...f, [cle]: valeur }));
  }

  async function inscrire(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      const res = await fetch("/api/auth/inscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErreur(data?.error ?? "Inscription impossible.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setErreur("Erreur réseau.");
    } finally {
      setChargement(false);
    }
  }

  const input = `${inputClass} border-white/10 bg-white/5 text-white placeholder:text-neutral-500`;
  const label = `${labelClass} text-neutral-400`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d1713] px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
            <Icon name="spark" className="h-6 w-6" />
          </div>
          <div className="leading-tight">
            <p className="text-xl font-extrabold tracking-tight text-white">Boutika</p>
            <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-400/80">
              Gestion PME CEMAC
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
          <h1 className="text-lg font-bold text-white">Inscrire ma boutique</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Créez votre espace gérant. Vous pourrez ensuite ajouter vos vendeurs.
          </p>

          <form onSubmit={inscrire} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Votre nom</label>
                <input
                  value={form.nom}
                  onChange={(e) => champ("nom", e.target.value)}
                  className={input}
                  placeholder="Nom et prénom"
                />
              </div>
              <div>
                <label className={label}>Identifiant</label>
                <input
                  value={form.identifiant}
                  onChange={(e) => champ("identifiant", e.target.value)}
                  autoComplete="username"
                  className={input}
                  placeholder="Ex : gerant.akwa"
                />
              </div>
            </div>

            <div>
              <label className={label}>PIN (4 caractères minimum)</label>
              <input
                type="password"
                inputMode="numeric"
                value={form.pin}
                onChange={(e) => champ("pin", e.target.value)}
                autoComplete="new-password"
                className={input}
                placeholder="••••"
              />
            </div>

            <div className="border-t border-white/10 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-400/80">
                Votre boutique
              </p>
              <div className="space-y-4">
                <div>
                  <label className={label}>Nom de la boutique</label>
                  <input
                    value={form.boutiqueNom}
                    onChange={(e) => champ("boutiqueNom", e.target.value)}
                    className={input}
                    placeholder="Ex : Boutique Akwa"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label}>Ville</label>
                    <input
                      value={form.ville}
                      onChange={(e) => champ("ville", e.target.value)}
                      className={input}
                    />
                  </div>
                  <div>
                    <label className={label}>Téléphone</label>
                    <input
                      value={form.telephone}
                      onChange={(e) => champ("telephone", e.target.value)}
                      className={input}
                      placeholder="+237…"
                    />
                  </div>
                </div>
                <div>
                  <label className={label}>Adresse</label>
                  <input
                    value={form.adresse}
                    onChange={(e) => champ("adresse", e.target.value)}
                    className={input}
                    placeholder="Quartier, rue…"
                  />
                </div>
              </div>
            </div>

            {erreur ? (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">{erreur}</p>
            ) : null}

            <Button type="submit" disabled={chargement} className="w-full py-3">
              {chargement ? "Inscription…" : "Créer mon espace"}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-neutral-400">
            Déjà inscrit ?{" "}
            <a href="/login" className="font-semibold text-emerald-400 hover:text-emerald-300">
              Se connecter
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
