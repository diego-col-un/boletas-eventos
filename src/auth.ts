import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { pool } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET!;

export interface JwtPayload {
  userId: number;
  rol: "admin" | "vendedor" | "portero";
  nombre: string;
}

export function firmarToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

// Extiende Request para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      usuario?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Falta el token" });
  }
  try {
    const token = header.slice(7);
    req.usuario = jwt.verify(token, JWT_SECRET) as JwtPayload;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function requireRole(...roles: JwtPayload["rol"][]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return res.status(403).json({ error: "No tienes permiso para esto" });
    }

    const { rows } = await pool.query(
      `SELECT r.nombre AS rol
       FROM usuario u JOIN rol r ON r.id = u.rol_id
       WHERE u.id = $1 AND u.activo = TRUE`,
      [req.usuario.userId]
    );
    const rolActual = String(rows[0]?.rol ?? "").trim().toLowerCase();
    const rolesPermitidos = roles.map((rol) => rol.toLowerCase());
    if (!rolesPermitidos.includes(rolActual)) {
      return res.status(403).json({ error: "No tienes permiso para esto" });
    }

    req.usuario.rol = rolActual as JwtPayload["rol"];
    next();
  };
}