import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

export const checkinRouter = Router();
checkinRouter.use(requireAuth);

// Buscar por cédula (admin y portero)
checkinRouter.get("/eventos/:eventoId/entradas/:cedula", requireRole("admin", "portero"), async (req, res) => {
  const cedula = typeof req.params.cedula === "string" ? req.params.cedula.trim() : "";
  if (!cedula) return res.status(400).json({ error: "La cédula es obligatoria" });

  const { rows } = await pool.query(
    `SELECT p.nombre, p.cedula, e.monto_pagado, e.checkin_en
     FROM entrada e
     JOIN persona p ON p.id = e.persona_id
     WHERE e.evento_id = $1 AND p.cedula = $2 AND NOT e.anulada`,
    [req.params.eventoId, cedula]
  );
  if (!rows[0]) return res.status(404).json({ error: "No encontrada" });
  res.json(rows[0]);
});

// Marcar ingreso (admin y portero), solo si el evento está activo
checkinRouter.post("/eventos/:eventoId/checkin", requireRole("admin", "portero"), async (req, res) => {
  const cedula = typeof req.body?.cedula === "string" ? req.body.cedula.trim() : "";
  const eventoId = req.params.eventoId;
  if (!cedula) return res.status(400).json({ error: "La cédula es obligatoria" });

  const evRes = await pool.query(`SELECT estado FROM evento WHERE id = $1`, [eventoId]);
  if (evRes.rows[0]?.estado !== "activo") {
    return res.status(409).json({ error: "El evento no está activo" });
  }

  const { rows } = await pool.query(
    `UPDATE entrada SET checkin_en = now(), checkin_por = $3
     WHERE evento_id = $1
       AND persona_id = (SELECT id FROM persona WHERE cedula = $2)
       AND checkin_en IS NULL AND NOT anulada
     RETURNING id, checkin_en`,
    [eventoId, cedula, req.usuario!.userId]
  );
  if (!rows[0]) return res.status(409).json({ error: "Ya había ingresado o no existe la boleta" });
  res.json({ checkin_en: rows[0].checkin_en });
});