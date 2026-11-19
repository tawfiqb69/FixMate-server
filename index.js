
import "dotenv/config";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";

const port = env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    console.log("MongoDB connected successfully");

    app.listen(port, () => {
      console.log(`FixMate server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
