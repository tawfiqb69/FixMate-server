import { MongoClient } from "mongodb";
import { env } from "./env.js";

const client = new MongoClient(env.DB_URI);
let db;

let dbPromise;

export function connectDB() {
  if (!dbPromise) {
    dbPromise = client
      .connect()
      .then(() => {
        db = client.db(env.DB_NAME);
        return db;
      })
      .catch((err) => {
        dbPromise = undefined;
        throw err;
      });
  }
  return dbPromise;
}

// Use this in routes to get a collection, e.g. getDB().collection("services")
export function getDB() {
  if (!db) throw new Error("Database not connected yet");
  return db;
}

export async function closeDB() {
  await client.close();
  dbPromise = undefined;
}