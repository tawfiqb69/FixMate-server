
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import meRoutes from "./routes/me.js";
import testRoleRoutes from "./routes/testRoles.js";

const app = express();

// Global middlewares
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "OK",
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FixMate server is running",
  });
});

// API routes
app.use("/api/me", meRoutes);
app.use("/api/test-roles", testRoleRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server error",
  });
});

export default app;
