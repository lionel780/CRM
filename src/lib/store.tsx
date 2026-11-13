"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppState,
  Boutique,
  Client,
  Devis,
  Facture,
  NouveauDevis,
  NouvelleFacture,
  NouvelleVente,
  Operateur,
  Parametres,
  Produit,
  Rappel,
  Role,
  StatutDevis,
  Utilisateur,
  Vente,
} from "./types";
import { seedState } from "./seed";

type DonneesServeur = Omit<AppState, "boutiqueActiveId">;

async function requete<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : "Erreur serveur";
    throw new Error(message);
  }
  return data as T;
}

interface AppContextValue {
  state: AppState;
  erreur: string | null;
  effacerErreur: () => void;
  rafraichir: () => Promise<void>;
  setBoutiqueActive: (id: string) => void;
  getProduit: (id: string) => Produit | undefined;
  addBoutique: (b: Omit<Boutique, "id" | "actif">) => Promise<void>;
  toggleBoutique: (id: string) => Promise<void>;
  addProduit: (p: Omit<Produit, "id">) => Promise<void>;
  updateProduit: (id: string, patch: Partial<Produit>) => Promise<void>;
  ajusterStock: (id: string, delta: number) => Promise<void>;
  deleteProduit: (id: string) => Promise<void>;
  creerVente: (v: NouvelleVente) => Promise<Vente | null>;
  creerFacture: (f: NouvelleFacture) => Promise<Facture | null>;
  payerFacture: (id: string, operateur: Operateur, telephone: string) => Promise<void>;
  deleteFacture: (id: string) => Promise<void>;
  addClient: (c: { nom: string; telephone?: string; email?: string; adresse?: string }) => Promise<Client | null>;
  updateClient: (id: string, patch: Partial<Pick<Client, "nom" | "telephone" | "email" | "adresse">>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  creerDevis: (d: NouveauDevis) => Promise<Devis | null>;
  changerStatutDevis: (id: string, statut: StatutDevis) => Promise<void>;
  convertirDevis: (id: string) => Promise<Facture | null>;
  deleteDevis: (id: string) => Promise<void>;
  creerRappel: (clientId: string, message?: string) => Promise<Rappel | null>;
  envoyerRappel: (id: string) => Promise<void>;
  genererRappels: () => Promise<void>;
  deleteRappel: (id: string) => Promise<void>;
  updateParametres: (patch: Partial<Parametres>) => Promise<void>;
  addUtilisateur: (u: {
    nom: string;
    identifiant: string;
    pin: string;
    role: Role;
    boutiqueId?: string;
  }) => Promise<void>;
  updateUtilisateur: (
    id: string,
    patch: Partial<Pick<Utilisateur, "nom" | "actif" | "role" | "boutiqueId">> & { pin?: string },
  ) => Promise<void>;
  deleteUtilisateur: (id: string) => Promise<void>;
  resetDemo: () => Promise<void>;
  deconnexion: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(seedState);
  const [erreur, setErreur] = useState<string | null>(null);

  const appliquer = useCallback((data: DonneesServeur) => {
    setState((s) => {
      let boutiqueActiveId = s.boutiqueActiveId;
      if (data.utilisateur?.role === "vendeur") {
        boutiqueActiveId = data.boutiques[0]?.id ?? "all";
      } else if (boutiqueActiveId !== "all" && !data.boutiques.some((b) => b.id === boutiqueActiveId)) {
        boutiqueActiveId = "all";
      }
      return { ...s, ...data, boutiqueActiveId };
    });
  }, []);

  const rafraichir = useCallback(async () => {
    const data = await requete<DonneesServeur>("/api/bootstrap");
    appliquer(data);
  }, [appliquer]);

  useEffect(() => {
    if (window.location.pathname === "/login") return;
    let annule = false;
    (async () => {
      try {
        const data = await requete<DonneesServeur>("/api/bootstrap");
        if (!annule) appliquer(data);
      } catch (e) {
        if (!annule) setErreur(e instanceof Error ? e.message : "Erreur de chargement");
      }
    })();
    return () => {
      annule = true;
    };
  }, [appliquer]);

  const tenter = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      try {
        setErreur(null);
        const resultat = await fn();
        await rafraichir();
        return resultat;
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Erreur serveur");
        return null;
      }
    },
    [rafraichir],
  );

  const setBoutiqueActive = useCallback((id: string) => {
    setState((s) => ({ ...s, boutiqueActiveId: id }));
  }, []);

  const effacerErreur = useCallback(() => setErreur(null), []);

  const getProduit = useCallback(
    (id: string) => state.produits.find((p) => p.id === id),
    [state.produits],
  );

  const addBoutique = useCallback(
    async (b: Omit<Boutique, "id" | "actif">) => {
      await tenter(async () => {
        await requete("/api/boutiques", { method: "POST", body: JSON.stringify(b) });
        return true;
      });
    },
    [tenter],
  );

  const toggleBoutique = useCallback(
    async (id: string) => {
      const b = state.boutiques.find((x) => x.id === id);
      if (!b) return;
      await tenter(async () => {
        await requete(`/api/boutiques/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ actif: !b.actif }),
        });
        return true;
      });
    },
    [state.boutiques, tenter],
  );

  const addProduit = useCallback(
    async (p: Omit<Produit, "id">) => {
      await tenter(async () => {
        await requete("/api/produits", { method: "POST", body: JSON.stringify(p) });
        return true;
      });
    },
    [tenter],
  );

  const updateProduit = useCallback(
    async (id: string, patch: Partial<Produit>) => {
      await tenter(async () => {
        await requete(`/api/produits/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        return true;
      });
    },
    [tenter],
  );

  const ajusterStock = useCallback(
    async (id: string, delta: number) => {
      await tenter(async () => {
        await requete(`/api/produits/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ stockDelta: delta }),
        });
        return true;
      });
    },
    [tenter],
  );

  const deleteProduit = useCallback(
    async (id: string) => {
      await tenter(async () => {
        await requete(`/api/produits/${id}`, { method: "DELETE" });
        return true;
      });
    },
    [tenter],
  );

  const creerVente = useCallback(
    async (v: NouvelleVente): Promise<Vente | null> =>
      tenter(async () =>
        requete<Vente>("/api/ventes", {
          method: "POST",
          body: JSON.stringify({
            boutiqueId: v.boutiqueId,
            modePaiement: v.modePaiement,
            clientId: v.clientId,
            clientNom: v.clientNom,
            clientTel: v.clientTel,
            lignes: v.lignes.map((l) => ({ produitId: l.produitId, quantite: l.quantite })),
          }),
        }),
      ),
    [tenter],
  );

  const creerFacture = useCallback(
    async (f: NouvelleFacture): Promise<Facture | null> =>
      tenter(async () =>
        requete<Facture>("/api/factures", {
          method: "POST",
          body: JSON.stringify({
            boutiqueId: f.boutiqueId,
            clientId: f.clientId,
            clientNom: f.clientNom,
            clientTel: f.clientTel,
            echeance: f.echeance,
            lignes: f.lignes.map((l) => ({ produitId: l.produitId, quantite: l.quantite })),
          }),
        }),
      ),
    [tenter],
  );

  const payerFacture = useCallback(
    async (id: string, operateur: Operateur, telephone: string) => {
      await tenter(async () => {
        await requete(`/api/factures/${id}/payer`, {
          method: "POST",
          body: JSON.stringify({ operateur, telephone }),
        });
        return true;
      });
    },
    [tenter],
  );

  const deleteFacture = useCallback(
    async (id: string) => {
      await tenter(async () => {
        await requete(`/api/factures/${id}`, { method: "DELETE" });
        return true;
      });
    },
    [tenter],
  );

  const addClient = useCallback(
    async (c: { nom: string; telephone?: string; email?: string; adresse?: string }) => {
      const boutiqueId =
        state.boutiqueActiveId !== "all" ? state.boutiqueActiveId : state.boutiques[0]?.id;
      return tenter(async () =>
        requete<Client>("/api/clients", { method: "POST", body: JSON.stringify({ ...c, boutiqueId }) }),
      );
    },
    [tenter, state.boutiqueActiveId, state.boutiques],
  );

  const updateClient = useCallback(
    async (id: string, patch: Partial<Pick<Client, "nom" | "telephone" | "email" | "adresse">>) => {
      await tenter(async () => {
        await requete(`/api/clients/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        return true;
      });
    },
    [tenter],
  );

  const deleteClient = useCallback(
    async (id: string) => {
      await tenter(async () => {
        await requete(`/api/clients/${id}`, { method: "DELETE" });
        return true;
      });
    },
    [tenter],
  );

  const creerDevis = useCallback(
    async (d: NouveauDevis): Promise<Devis | null> =>
      tenter(async () =>
        requete<Devis>("/api/devis", {
          method: "POST",
          body: JSON.stringify({
            boutiqueId: d.boutiqueId,
            clientId: d.clientId,
            clientNom: d.clientNom,
            clientTel: d.clientTel,
            validite: d.validite,
            lignes: d.lignes.map((l) => ({ produitId: l.produitId, quantite: l.quantite })),
          }),
        }),
      ),
    [tenter],
  );

  const changerStatutDevis = useCallback(
    async (id: string, statut: StatutDevis) => {
      await tenter(async () => {
        await requete(`/api/devis/${id}`, { method: "PATCH", body: JSON.stringify({ statut }) });
        return true;
      });
    },
    [tenter],
  );

  const convertirDevis = useCallback(
    async (id: string): Promise<Facture | null> =>
      tenter(async () => requete<Facture>(`/api/devis/${id}/convertir`, { method: "POST" })),
    [tenter],
  );

  const deleteDevis = useCallback(
    async (id: string) => {
      await tenter(async () => {
        await requete(`/api/devis/${id}`, { method: "DELETE" });
        return true;
      });
    },
    [tenter],
  );

  const creerRappel = useCallback(
    async (clientId: string, message?: string): Promise<Rappel | null> =>
      tenter(async () =>
        requete<Rappel>("/api/rappels", {
          method: "POST",
          body: JSON.stringify({ clientId, message }),
        }),
      ),
    [tenter],
  );

  const envoyerRappel = useCallback(
    async (id: string) => {
      await tenter(async () => {
        await requete(`/api/rappels/${id}`, { method: "PATCH", body: JSON.stringify({ statut: "envoye" }) });
        return true;
      });
    },
    [tenter],
  );

  const genererRappels = useCallback(async () => {
    await tenter(async () => {
      await requete("/api/rappels", { method: "PUT" });
      return true;
    });
  }, [tenter]);

  const deleteRappel = useCallback(
    async (id: string) => {
      await tenter(async () => {
        await requete(`/api/rappels/${id}`, { method: "DELETE" });
        return true;
      });
    },
    [tenter],
  );

  const updateParametres = useCallback(
    async (patch: Partial<Parametres>) => {
      await tenter(async () => {
        await requete("/api/parametres", { method: "PUT", body: JSON.stringify(patch) });
        return true;
      });
    },
    [tenter],
  );

  const addUtilisateur = useCallback(
    async (u: { nom: string; identifiant: string; pin: string; role: Role; boutiqueId?: string }) => {
      await tenter(async () => {
        await requete("/api/utilisateurs", { method: "POST", body: JSON.stringify(u) });
        return true;
      });
    },
    [tenter],
  );

  const updateUtilisateur = useCallback(
    async (
      id: string,
      patch: Partial<Pick<Utilisateur, "nom" | "actif" | "role" | "boutiqueId">> & { pin?: string },
    ) => {
      await tenter(async () => {
        await requete(`/api/utilisateurs/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
        return true;
      });
    },
    [tenter],
  );

  const deleteUtilisateur = useCallback(
    async (id: string) => {
      await tenter(async () => {
        await requete(`/api/utilisateurs/${id}`, { method: "DELETE" });
        return true;
      });
    },
    [tenter],
  );

  const resetDemo = useCallback(async () => {
    await tenter(async () => {
      const data = await requete<DonneesServeur>("/api/reset", { method: "POST" });
      setState((s) => ({ ...s, ...data, boutiqueActiveId: "all" }));
      return true;
    });
  }, [tenter]);

  const deconnexion = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      erreur,
      effacerErreur,
      rafraichir,
      setBoutiqueActive,
      getProduit,
      addBoutique,
      toggleBoutique,
      addProduit,
      updateProduit,
      ajusterStock,
      deleteProduit,
      creerVente,
      creerFacture,
      payerFacture,
      deleteFacture,
      addClient,
      updateClient,
      deleteClient,
      creerDevis,
      changerStatutDevis,
      convertirDevis,
      deleteDevis,
      creerRappel,
      envoyerRappel,
      genererRappels,
      deleteRappel,
      updateParametres,
      addUtilisateur,
      updateUtilisateur,
      deleteUtilisateur,
      resetDemo,
      deconnexion,
    }),
    [
      state,
      erreur,
      effacerErreur,
      rafraichir,
      setBoutiqueActive,
      getProduit,
      addBoutique,
      toggleBoutique,
      addProduit,
      updateProduit,
      ajusterStock,
      deleteProduit,
      creerVente,
      creerFacture,
      payerFacture,
      deleteFacture,
      addClient,
      updateClient,
      deleteClient,
      creerDevis,
      changerStatutDevis,
      convertirDevis,
      deleteDevis,
      creerRappel,
      envoyerRappel,
      genererRappels,
      deleteRappel,
      updateParametres,
      addUtilisateur,
      updateUtilisateur,
      deleteUtilisateur,
      resetDemo,
      deconnexion,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp doit être utilisé dans <Providers>");
  return ctx;
}
