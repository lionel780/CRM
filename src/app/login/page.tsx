"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Button, inputClass, labelClass } from "@/components/ui";

export default function LoginPage() {
  const [identifiant, setIdentifiant] = useState("");
  const [pin, setPin] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function connexion(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setChargement(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiant, pin }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErreur(data?.error ?? "Connexion impossible.");
        return;
      }
      window.location.href = data?.role === "vendeur" ? "/ventes" : "/";

    } catch {
      setErreur("Erreur réseau.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d1713] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
            <Icon name="spark" className="h-6 w-6" />
          </div>
          <div className="leading-tight">
            <p className="text-xl font-extrabold tracking-tight text-white">Boutika</p>
            <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-400/80">Gestion PME CEMAC</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
          <h1 className="text-lg font-bold text-white">Connexion</h1>
          <p className="mt-1 text-sm text-neutral-400">Accédez à votre espace de gestion.</p>

          <form onSubmit={connexion} className="mt-5 space-y-4">
            <div>
              <label className={`${labelClass} text-neutral-400`}>Identifiant</label>
              <input
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                autoComplete="username"
                className={`${inputClass} border-white/10 bg-white/5 text-white placeholder:text-neutral-500`}
                placeholder="Votre identifiant"
              />
            </div>
            <div>
              <label className={`${labelClass} text-neutral-400`}>PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="current-password"
                className={`${inputClass} border-white/10 bg-white/5 text-white placeholder:text-neutral-500`}
                placeholder="••••"
              />
            </div>

            {erreur ? (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">{erreur}</p>
            ) : null}

            <Button type="submit" disabled={chargement} className="w-full py-3">
              {chargement ? "Connexion…" : "Se connecter"}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-neutral-400">
            Pas encore de compte gérant ?{" "}
            <a href="/inscription" className="font-semibold text-emerald-400 hover:text-emerald-300">
              Inscrire ma boutique
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
