import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { bonsLivraison, lignesBonLivraison, clients, vehicules, employes } from "../db/schema.js";

export const bonsLivraisonRouter = Router();

type DbOuTransaction = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// Calcule le prochain numéro de bon de livraison (format BL00001, BL00028, ...)
// en se basant sur le plus grand numéro existant, y compris ceux importés de
// l'historique Excel — même logique que genererNumeroFacture.
async function genererNumeroBonLivraison(tx: DbOuTransaction): Promise<string> {
  const rows = (await tx.execute(
    sql`select numero from bons_livraison where numero ~ '^BL[0-9]+$' order by (substring(numero from 3))::bigint desc limit 1`,
  )) as unknown as Array<{ numero: string }>;
  const dernier = rows[0]?.numero;
  const prochain = dernier ? parseInt(dernier.slice(2), 10) + 1 : 1;
  return `BL${String(prochain).padStart(5, "0")}`;
}

bonsLivraisonRouter.get("/", async (_req, res) => {
  const rows = await db.select().from(bonsLivraison);
  res.json(rows);
});

bonsLivraisonRouter.get("/:id", async (req, res) => {
  const [bon] = await db.select().from(bonsLivraison).where(eq(bonsLivraison.id, req.params.id));
  if (!bon) return res.status(404).json({ error: "Introuvable" });
  const [client] = bon.clientId
    ? await db.select().from(clients).where(eq(clients.id, bon.clientId))
    : [null];
  const [vehicule] = bon.vehiculeId
    ? await db.select().from(vehicules).where(eq(vehicules.id, bon.vehiculeId))
    : [null];
  const [chauffeur] = bon.chauffeurId
    ? await db.select().from(employes).where(eq(employes.id, bon.chauffeurId))
    : [null];
  const lignes = await db
    .select()
    .from(lignesBonLivraison)
    .where(eq(lignesBonLivraison.bonLivraisonId, req.params.id))
    .orderBy(lignesBonLivraison.ordre);
  res.json({ ...bon, client, vehicule, chauffeur, lignes });
});

// Crée un bon de livraison avec ses lignes en une seule requête. Le numéro
// est toujours généré côté serveur (BL00001, BL00002, ...), sur le même
// principe que les factures.
bonsLivraisonRouter.post("/", async (req, res) => {
  const { lignes, numero: _numeroIgnore, ...bonData } = req.body as {
    lignes?: Array<Record<string, unknown>>;
    numero?: unknown;
    [key: string]: unknown;
  };
  const MAX_TENTATIVES = 5;
  for (let tentative = 1; tentative <= MAX_TENTATIVES; tentative++) {
    try {
      const resultat = await db.transaction(async (tx) => {
        const numero = await genererNumeroBonLivraison(tx);
        const [bon] = await tx
          .insert(bonsLivraison)
          .values({ ...bonData, numero } as any)
          .returning();
        let insertedLignes: unknown[] = [];
        if (lignes?.length) {
          insertedLignes = await tx
            .insert(lignesBonLivraison)
            .values(
              lignes.map((l, i) => ({ ...l, bonLivraisonId: bon.id, ordre: i })) as any,
            )
            .returning();
        }
        return { ...bon, lignes: insertedLignes };
      });
      return res.status(201).json(resultat);
    } catch (err: any) {
      const estConflitNumero = err?.code === "23505";
      if (estConflitNumero && tentative < MAX_TENTATIVES) continue;
      return res.status(400).json({ error: err.message });
    }
  }
});

bonsLivraisonRouter.put("/:id", async (req, res) => {
  const { lignes, numero: _numeroIgnore, ...bonData } = req.body as {
    lignes?: Array<Record<string, unknown>>;
    numero?: unknown;
    [key: string]: unknown;
  };
  try {
    const [bon] = await db
      .update(bonsLivraison)
      .set(bonData as any)
      .where(eq(bonsLivraison.id, req.params.id))
      .returning();
    if (!bon) return res.status(404).json({ error: "Introuvable" });

    if (lignes) {
      await db.delete(lignesBonLivraison).where(eq(lignesBonLivraison.bonLivraisonId, req.params.id));
      if (lignes.length) {
        await db
          .insert(lignesBonLivraison)
          .values(
            lignes.map((l, i) => ({ ...l, bonLivraisonId: bon.id, ordre: i })) as any,
          );
      }
    }
    res.json(bon);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

bonsLivraisonRouter.delete("/:id", async (req, res) => {
  const [row] = await db.delete(bonsLivraison).where(eq(bonsLivraison.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Introuvable" });
  res.status(204).end();
});
