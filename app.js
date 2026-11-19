import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import meRoutes from "./routes/me.js";

const app = express();

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ success: true, message: "FixMate server is running" });
});

app.get("/health", (req, res) => {
  res.json({ success: true, message: "OK" });
});

app.use("/api/me", meRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ success: false, message: err.message || "Server error" });
});

export default app;