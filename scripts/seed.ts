import bcrypt from "bcryptjs";
import { pool } from "../src/db.js";

const usuarios = [
  { nombre: "Admin", email: "admin@sangrenueva.com", password: "Admin123!", rol: "admin" },
  { nombre: "Vendedor 1", email: "vendedor1@sangrenueva.com", password: "Vendedor123!", rol: "vendedor" },
  { nombre: "Vendedor 2", email: "vendedor2@sangrenueva.com", password: "Vendedor123!", rol: "vendedor" },
  { nombre: "Portero", email: "portero@sangrenueva.com", password: "Portero123!", rol: "portero" },
];

async function seed() {
  for (const u of usuarios) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO usuario (nombre, email, password_hash, rol_id)
       VALUES ($1, $2, $3, (SELECT id FROM rol WHERE nombre = $4))
       ON CONFLICT (email) DO NOTHING`,
      [u.nombre, u.email, hash, u.rol]
    );
    console.log(`Creado: ${u.email} (${u.rol})`);
  }
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});