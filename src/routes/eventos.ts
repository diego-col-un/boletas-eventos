import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

export const eventosRouter = Router();
eventosRouter.use(requireAuth);

// Todos los roles pueden LISTAR (solo lectura para vendedor/portero)
eventosRouter.get("/", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT ev.*,
            COALESCE((SELECT COUNT(*) FROM entrada e WHERE e.evento_id = ev.id AND NOT e.anulada), 0) AS vendidas,
            COALESCE((SELECT SUM(v.monto_total) FROM venta v WHERE v.evento_id = ev.id AND v.anulada_en IS NULL), 0) AS recaudado
     FROM evento ev ORDER BY ev.fecha_inicio DESC`
  );
  res.json(rows);
});

eventosRouter.get("/:id", async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM evento WHERE id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: "Evento no encontrado" });
  res.json(rows[0]);
});

const eventoSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional(),
  lugar: z.string().optional(),
  fechaInicio: z.string(), // ISO string
  aforo: z.number().int().positive(),
  precioBase: z.number().nonnegative(),
  precioMinimo: z.number().nonnegative(),
});

// Solo admin crea
eventosRouter.post("/", requireRole("admin"), async (req, res) => {
  const parsed = eventoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  if (d.precioMinimo > d.precioBase) {
    return res.status(400).json({ error: "El precio mínimo no puede ser mayor al precio base" });
  }

  const { rows } = await pool.query(
    `INSERT INTO evento (nombre, descripcion, lugar, fecha_inicio, aforo, precio_base, precio_minimo, creado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [d.nombre, d.descripcion ?? null, d.lugar ?? null, d.fechaInicio, d.aforo, d.precioBase, d.precioMinimo, req.usuario!.userId]
  );
  res.status(201).json(rows[0]);
});

// Solo admin cambia el estado (borrador -> activo -> cerrado). Sin DELETE.
const estadoSchema = z.object({ estado: z.enum(["borrador", "activo", "cerrado", "cancelado"]) });

eventosRouter.patch("/:id/estado", requireRole("admin"), async (req, res) => {
  const parsed = estadoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Estado inválido" });

  const { rows } = await pool.query(
    `UPDATE evento SET estado = $1 WHERE id = $2 RETURNING *`,
    [parsed.data.estado, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Evento no encontrado" });
  res.json(rows[0]);
});