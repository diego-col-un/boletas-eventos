import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { authRouter } from "./routes/auth.js";
import { eventosRouter } from "./routes/eventos.js";
import { ventasRouter } from "./routes/ventas.js";
import { checkinRouter } from "./routes/checkin.js";
import { estadisticasRouter } from "./routes/estadisticas.js";
import { pool } from "./db.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/eventos", eventosRouter);
app.use("/api", ventasRouter);
app.use("/api", checkinRouter);
app.use("/api", estadisticasRouter);
// Golpea el servidor (Render) y la base de datos (Neon) en una sola petición,
// para usarse como "latido" desde el frontend y evitar el cold-start de ambos.
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).send("ok");
  } catch {
    res.status(503).send("db-down");
  }
});

// Sirve el frontend estático (misma app, sin CORS que gestionar en producción)
app.use(express.static(path.join(__dirname, "../public")));

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));