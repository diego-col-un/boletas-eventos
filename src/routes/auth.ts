import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db.js";
import { firmarToken } from "../auth.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Datos inválidos" });

  const { email, password } = parsed.data;
  const { rows } = await pool.query(
    `SELECT u.id, u.nombre, u.password_hash, r.nombre AS rol
     FROM usuario u JOIN rol r ON r.id = u.rol_id
     WHERE u.email = $1 AND u.activo = TRUE`,
    [email]
  );

  const usuario = rows[0];
  if (!usuario) return res.status(401).json({ error: "Credenciales inválidas" });

  const ok = await bcrypt.compare(password, usuario.password_hash);
  if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

  const token = firmarToken({ userId: usuario.id, rol: usuario.rol, nombre: usuario.nombre });
  res.json({ token, nombre: usuario.nombre, rol: usuario.rol });
});