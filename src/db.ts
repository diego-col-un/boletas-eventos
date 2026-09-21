import pg from "pg";
import dotenv from "dotenv";
import dns from "dns";

dotenv.config();

// Windows a veces prefiere IPv6 al resolver el hostname de Neon y falla con ENOTFOUND.
// Esto fuerza a Node a intentar IPv4 primero.
dns.setDefaultResultOrder("ipv4first");

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});