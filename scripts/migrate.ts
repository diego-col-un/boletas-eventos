import { readFileSync } from "fs";
import { pool } from "../src/db.js";

const sql = readFileSync(new URL("../migrations/001_init.sql", import.meta.url), "utf-8");

async function run() {
  await pool.query(sql);
  console.log("Migración aplicada correctamente.");
  await pool.end();
}

run().catch((err) => {
  console.error("Error en la migración:", err);
  process.exit(1);
});