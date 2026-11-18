import { MongoClient } from "mongodb";
import { env } from "./env.js";

const client = new MongoClient(env.DB_URI);
let db;

export async function connectDB() {
  await client.connect();
  db = client.db(env.DB_NAME);
  return db;
}

// Use this in routes to get a collection, e.g. getDB().collection("services")
export function getDB() {
  if (!db) throw new Error("Database not connected yet");
  return db;
}

export async function closeDB() {
  await client.close();
}