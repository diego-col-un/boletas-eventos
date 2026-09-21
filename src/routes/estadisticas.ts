import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth, requireRole } from "../auth.js";

export const estadisticasRouter = Router();
estadisticasRouter.use(requireAuth);

// Resumen liviano para el polling cada 5-10 s (admin y portero)
estadisticasRouter.get("/eventos/:eventoId/resumen", requireRole("admin", "portero"), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE NOT anulada) AS vendidas,
            COUNT(*) FILTER (WHERE checkin_en IS NOT NULL AND NOT anulada) AS ingresaron
     FROM entrada WHERE evento_id = $1`,
    [req.params.eventoId]
  );
  res.json(rows[0]);
});

// Estadísticas completas (solo admin)
estadisticasRouter.get("/eventos/:eventoId/estadisticas", requireRole("admin"), async (req, res) => {
  const eventoId = req.params.eventoId;

  const resumen = await pool.query(
    `SELECT COUNT(*) AS entradas_vendidas, SUM(monto_pagado) AS total_recaudado,
            ROUND(AVG(monto_pagado)) AS ticket_promedio
     FROM entrada WHERE evento_id = $1 AND NOT anulada`,
    [eventoId]
  );

  const porVendedor = await pool.query(
    `SELECT u.nombre, COUNT(*) AS ventas, SUM(v.monto_total) AS recaudado
     FROM venta v JOIN usuario u ON u.id = v.vendido_por
     WHERE v.evento_id = $1 AND v.anulada_en IS NULL
     GROUP BY u.nombre ORDER BY recaudado DESC`,
    [eventoId]
  );

  const asistencia = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE NOT anulada) AS vendidas,
            COUNT(*) FILTER (WHERE checkin_en IS NOT NULL AND NOT anulada) AS ingresaron
     FROM entrada WHERE evento_id = $1`,
    [eventoId]
  );

  res.json({
    resumen: resumen.rows[0],
    porVendedor: porVendedor.rows,
    asistencia: asistencia.rows[0],
  });
});