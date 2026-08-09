import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";

export const dashboardRouter = Router();

dashboardRouter.get("/synthese-journaliere", async (_req, res) => {
  const rows = await db.execute(sql`select * from v_synthese_journaliere order by date_mouvement desc`);
  res.json(rows);
});

dashboardRouter.get("/solde-stock-distribution", async (_req, res) => {
  const rows = await db.execute(sql`select * from v_solde_stock_distribution`);
  res.json(rows[0] ?? { stock_actuel: 0 });
});

dashboardRouter.get("/chiffre-affaires-mensuel", async (_req, res) => {
  const rows = await db.execute(sql`select * from v_chiffre_affaires_mensuel order by mois desc`);
  res.json(rows);
});

dashboardRouter.get("/dettes-distributeurs", async (_req, res) => {
  const rows = await db.execute(sql`select * from v_dettes_distributeurs order by solde_du desc`);
  // Le plafond de crédit est négocié en USD (cf. réponses du client) — il ne peut être
  // comparé qu'aux soldes en USD ; en CDF, le dépassement n'est pas évaluable sans taux de change.
  res.json(
    rows.map((r: any) => ({
      ...r,
      depasse_plafond: r.devise === "USD" && Number(r.solde_du) > Number(r.plafond_credit),
    })),
  );
});

dashboardRouter.get("/commissions-distributeurs", async (_req, res) => {
  const rows = await db.execute(
    sql`select * from v_commissions_distributeurs order by commission_due desc`,
  );
  res.json(rows);
});
