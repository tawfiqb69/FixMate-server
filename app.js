
import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import meRoutes from "./routes/me.js";
import servicesRouter from "./routes/services.js";
import uploadRouter from "./routes/upload.js";
import adminRouter from "./routes/admin.js";
import bookingsRouter from "./routes/bookings.js";
import usersRouter from "./routes/users.js";
import paymentsRouter from "./routes/payments.js";
import webhooksRouter from "./routes/webhooks.js";
import { connectDB } from "./config/db.js";

const app = express();

// Global middlewares
app.use(cors({ origin: env.CLIENT_URL, credentials: true, }));

// Connect to MongoDB on the first request (needed on Vercel)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use("/api/webhooks", webhooksRouter);
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
app.use("/api/services", servicesRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/admin", adminRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/users", usersRouter);
app.use("/api/payments", paymentsRouter);

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
