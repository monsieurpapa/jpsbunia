import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { factures, lignesFacture, encaissements, clients, services } from "../db/schema.js";

export const facturesRouter = Router();

type DbOuTransaction = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// Calcule le prochain numéro de facture (format F00001, F00025, ...) en se
// basant sur le plus grand numéro existant, tous types confondus. Exécuté
// dans la transaction qui insère la facture pour rester cohérent.
async function genererNumeroFacture(tx: DbOuTransaction): Promise<string> {
  const rows = (await tx.execute(
    sql`select numero from factures where numero ~ '^F[0-9]+$' order by (substring(numero from 2))::bigint desc limit 1`,
  )) as unknown as Array<{ numero: string }>;
  const dernier = rows[0]?.numero;
  const prochain = dernier ? parseInt(dernier.slice(1), 10) + 1 : 1;
  return `F${String(prochain).padStart(5, "0")}`;
}

facturesRouter.get("/", async (_req, res) => {
  const rows = await db.select().from(factures);
  res.json(rows);
});

facturesRouter.get("/:id", async (req, res) => {
  const [facture] = await db.select().from(factures).where(eq(factures.id, req.params.id));
  if (!facture) return res.status(404).json({ error: "Introuvable" });
  const [client] = await db.select().from(clients).where(eq(clients.id, facture.clientId));
  const lignes = await db
    .select({
      id: lignesFacture.id,
      factureId: lignesFacture.factureId,
      serviceId: lignesFacture.serviceId,
      tarifTransportId: lignesFacture.tarifTransportId,
      description: lignesFacture.description,
      quantite: lignesFacture.quantite,
      prixUnitaire: lignesFacture.prixUnitaire,
      tauxTva: lignesFacture.tauxTva,
      montantHt: lignesFacture.montantHt,
      reference: services.reference,
    })
    .from(lignesFacture)
    .leftJoin(services, eq(lignesFacture.serviceId, services.id))
    .where(eq(lignesFacture.factureId, req.params.id));
  const paiements = await db
    .select()
    .from(encaissements)
    .where(eq(encaissements.factureId, req.params.id));
  res.json({ ...facture, client, lignes, paiements });
});

// Crée une facture avec ses lignes en une seule requête (formulaire du front).
// Le numéro est toujours généré côté serveur (F00001, F00002, ...) : toute
// valeur "numero" envoyée par le client est ignorée pour garantir la
// séquence. En cas de collision (course entre deux créations simultanées),
// on retente avec le numéro suivant grâce à la contrainte unique en base.
facturesRouter.post("/", async (req, res) => {
  const { lignes, numero: _numeroIgnore, ...factureData } = req.body as {
    lignes?: Array<Record<string, unknown>>;
    numero?: unknown;
    [key: string]: unknown;
  };
  const MAX_TENTATIVES = 5;
  for (let tentative = 1; tentative <= MAX_TENTATIVES; tentative++) {
    try {
      const resultat = await db.transaction(async (tx) => {
        const numero = await genererNumeroFacture(tx);
        const [facture] = await tx
          .insert(factures)
          .values({ ...factureData, numero } as any)
          .returning();
        let insertedLignes: unknown[] = [];
        if (lignes?.length) {
          insertedLignes = await tx
            .insert(lignesFacture)
            .values(lignes.map((l) => ({ ...l, factureId: facture.id })) as any)
            .returning();
        }
        return { ...facture, lignes: insertedLignes };
      });
      return res.status(201).json(resultat);
    } catch (err: any) {
      const estConflitNumero = err?.code === "23505";
      if (estConflitNumero && tentative < MAX_TENTATIVES) continue;
      return res.status(400).json({ error: err.message });
    }
  }
});

facturesRouter.put("/:id", async (req, res) => {
  const { lignes, numero: _numeroIgnore, ...factureData } = req.body as {
    lignes?: Array<Record<string, unknown>>;
    numero?: unknown;
    [key: string]: unknown;
  };
  try {
    const [facture] = await db
      .update(factures)
      .set(factureData as any)
      .where(eq(factures.id, req.params.id))
      .returning();
    if (!facture) return res.status(404).json({ error: "Introuvable" });

    if (lignes) {
      await db.delete(lignesFacture).where(eq(lignesFacture.factureId, req.params.id));
      if (lignes.length) {
        await db
          .insert(lignesFacture)
          .values(lignes.map((l) => ({ ...l, factureId: facture.id })) as any);
      }
    }
    res.json(facture);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

facturesRouter.delete("/:id", async (req, res) => {
  const [row] = await db.delete(factures).where(eq(factures.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Introuvable" });
  res.status(204).end();
});
