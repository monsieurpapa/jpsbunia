import { Router, type Request } from "express";
import { and, eq, type AnyColumn, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "../db/index.js";
import type { AuthUser } from "../auth/middleware.js";

export interface ScopeConfig {
  /** Colonne Drizzle représentant la ville sur cette table (filtrage en lecture/écriture). */
  villeColumn?: AnyColumn;
  /** Nom de la propriété JS correspondante dans le corps de requête (pour l'auto-remplissage à la création). */
  villeField?: string;
  /** Filtre supplémentaire, ex. restriction par fonction (créditation/logistique) au sein d'un module. */
  extraFilter?: (user: AuthUser) => SQL | undefined;
}

/**
 * Routeur CRUD générique pour une table Drizzle qui possède une colonne `id`.
 * Couvre les opérations identiques répétées sur les ~14 tables de référentiel/saisie
 * (clients, services, employés, dépenses...) sans dupliquer le même code partout.
 *
 * Le paramètre `scope` optionnel applique un RBAC par ville et/ou par fonction :
 * un utilisateur avec une ville d'affectation ne voit/modifie que les lignes de
 * cette ville, et un utilisateur avec une fonction d'affectation (créditation,
 * logistique) ne voit que le sous-ensemble correspondant.
 */
export function crudRouter<T extends PgTable & { id: AnyColumn }>(table: T, scope?: ScopeConfig) {
  const router = Router();

  function scopeFilter(req: Request): SQL | undefined {
    const conditions: SQL[] = [];
    if (scope?.villeColumn && req.user?.villeAffectation) {
      conditions.push(eq(scope.villeColumn, req.user.villeAffectation));
    }
    if (scope?.extraFilter && req.user) {
      const c = scope.extraFilter(req.user);
      if (c) conditions.push(c);
    }
    if (conditions.length === 0) return undefined;
    return conditions.length === 1 ? conditions[0] : and(...conditions);
  }

  router.get("/", async (req, res) => {
    const filter = scopeFilter(req);
    const rows = filter
      ? await db.select().from(table as any).where(filter)
      : await db.select().from(table as any);
    res.json(rows);
  });

  router.get("/:id", async (req, res) => {
    const filter = scopeFilter(req);
    const where = filter ? and(eq(table.id, req.params.id), filter) : eq(table.id, req.params.id);
    const [row] = await db
      .select()
      .from(table as any)
      .where(where);
    if (!row) return res.status(404).json({ error: "Introuvable" });
    res.json(row);
  });

  router.post("/", async (req, res) => {
    try {
      const body = { ...req.body };
      if (scope?.villeField && req.user?.villeAffectation && !body[scope.villeField]) {
        body[scope.villeField] = req.user.villeAffectation;
      }
      const [row] = await db.insert(table as any).values(body).returning();
      res.status(201).json(row);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.put("/:id", async (req, res) => {
    try {
      const filter = scopeFilter(req);
      const where = filter ? and(eq(table.id, req.params.id), filter) : eq(table.id, req.params.id);
      const [row] = await db
        .update(table as any)
        .set(req.body)
        .where(where)
        .returning();
      if (!row) return res.status(404).json({ error: "Introuvable" });
      res.json(row);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete("/:id", async (req, res) => {
    const filter = scopeFilter(req);
    const where = filter ? and(eq(table.id, req.params.id), filter) : eq(table.id, req.params.id);
    const [row] = await db
      .delete(table as any)
      .where(where)
      .returning();
    if (!row) return res.status(404).json({ error: "Introuvable" });
    res.status(204).end();
  });

  return router;
}
