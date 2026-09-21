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
app.get("/health", (_req, res) => res.status(200).send("ok"));

// Sirve el frontend estático (misma app, sin CORS que gestionar en producción)
app.use(express.static(path.join(__dirname, "../public")));

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));