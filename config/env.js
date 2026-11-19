import "dotenv/config";

// Read all environment variables in one place.
export const env = {
  PORT: process.env.PORT || 5000,
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  DB_URI: process.env.DB_URI,
  DB_NAME: process.env.DB_NAME || "fixmate",
  IMGBB_API_KEY: process.env.IMGBB_API_KEY,
};

// Stop early if a required variable is missing.
if (!env.DB_URI) {
  console.error("Missing required env variable: DB_URI");
  process.exit(1);
}