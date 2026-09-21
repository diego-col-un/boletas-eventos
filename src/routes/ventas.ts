import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

export const ventasRouter = Router();
ventasRouter.use(requireAuth, requireRole("admin", "vendedor"));

function repartirMonto(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const sobrante = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < sobrante ? 1 : 0));
}

const ventaSchema = z.object({
  montoTotal: z.number().positive(),
  metodoPago: z.string().default("efectivo"),
  idempotencyKey: z.string().uuid(),
  personas: z
    .array(z.object({ cedula: z.string().min(4), nombre: z.string().min(1) }))
    .min(1),
});

ventasRouter.post("/eventos/:eventoId/ventas", async (req, res) => {
  const parsed = ventaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { montoTotal, metodoPago, idempotencyKey, personas } = parsed.data;
  const eventoId = Number(req.params.eventoId);

  // Cédulas repetidas dentro del mismo grupo
  const cedulas = personas.map((p) => p.cedula);
  if (new Set(cedulas).size !== cedulas.length) {
    return res.status(400).json({ error: "Hay una cédula repetida en el grupo" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Si ya existe una venta con esta idempotency key, devuélvela (evita duplicados por reintento)
    const existente = await client.query(`SELECT id FROM venta WHERE idempotency_key = $1`, [idempotencyKey]);
    if (existente.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(200).json({ ventaId: existente.rows[0].id, reintento: true });
    }

    // Bloquea la fila del evento y verifica estado + precio mínimo
    const evRes = await client.query(`SELECT estado, precio_minimo FROM evento WHERE id = $1 FOR SHARE`, [eventoId]);
    const evento = evRes.rows[0];
    if (!evento) throw Object.assign(new Error("Evento no encontrado"), { status: 404 });
    if (evento.estado !== "activo") throw Object.assign(new Error("El evento no está activo"), { status: 409 });

    const montos = repartirMonto(montoTotal, personas.length);
    const minimo = Number(evento.precio_minimo);
    if (Math.min(...montos) < minimo) {
      throw Object.assign(new Error(`Cada boleta debe valer al menos $${minimo}`), { status: 400 });
    }

    const ventaRes = await client.query(
      `INSERT INTO venta (evento_id, vendido_por, monto_total, num_personas, metodo_pago, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [eventoId, req.usuario!.userId, montoTotal, personas.length, metodoPago, idempotencyKey]
    );
    const ventaId = ventaRes.rows[0].id;

    const detalle = [];
    for (let i = 0; i < personas.length; i++) {
      const p = personas[i];
      const personaRes = await client.query(
        `INSERT INTO persona (cedula, nombre) VALUES ($1,$2)
         ON CONFLICT (cedula) DO UPDATE SET cedula = EXCLUDED.cedula
         RETURNING id`,
        [p.cedula, p.nombre]
      );
      const personaId = personaRes.rows[0].id;

      await client.query(
        `INSERT INTO entrada (evento_id, persona_id, venta_id, monto_pagado)
         VALUES ($1,$2,$3,$4)`,
        [eventoId, personaId, ventaId, montos[i]]
      );
      detalle.push({ cedula: p.cedula, nombre: p.nombre, monto: montos[i] });
    }

    await client.query("COMMIT");
    res.status(201).json({ ventaId, detalle });
  } catch (e: any) {
    await client.query("ROLLBACK");
    if (e.code === "23505") {
      return res.status(409).json({ error: "Alguna cédula ya tiene boleta vigente para este evento" });
    }
    res.status(e.status ?? 500).json({ error: e.message ?? "Error registrando la venta" });
  } finally {
    client.release();
  }
});

// Solo admin anula una venta (libera las cédulas)
ventasRouter.post("/ventas/:id/anular", requireRole("admin"), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`UPDATE entrada SET anulada = TRUE WHERE venta_id = $1`, [req.params.id]);
    const { rows } = await client.query(
      `UPDATE venta SET anulada_en = now(), anulada_por = $2 WHERE id = $1 RETURNING id`,
      [req.params.id, req.usuario!.userId]
    );
    await client.query("COMMIT");
    if (!rows[0]) return res.status(404).json({ error: "Venta no encontrada" });
    res.json({ anulada: true });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Error anulando la venta" });
  } finally {
    client.release();
  }
});