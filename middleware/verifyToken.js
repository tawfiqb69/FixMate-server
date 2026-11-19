import { createRemoteJWKSet, jwtVerify } from "jose";
import { getDB } from "../config/db.js";

// Created on first use, so .env is already loaded.
let jwks;
function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));
  }
  return jwks;
}

function unauthorized(res, message) {
  return res.status(401).json({ success: false, message });
}

export async function verifyToken(req, res, next) {
  const [type, token] = (req.headers.authorization || "").split(" ");
  if (type !== "Bearer" || !token) {
    return unauthorized(res, "Unauthorized: token missing");
  }

  let payload;
  try {
    const result = await jwtVerify(token, getJwks(), {
      issuer: process.env.CLIENT_URL,
      audience: process.env.CLIENT_URL,
    });
    payload = result.payload;
  } catch {
    return unauthorized(res, "Unauthorized: invalid or expired token");
  }

  if (!payload.email) return unauthorized(res, "Unauthorized: invalid token");

  // The role is read from the database, never from the token.
  const user = await getDB().collection("users").findOne({ email: payload.email });
  if (!user) return unauthorized(res, "Unauthorized: user not found");

  req.user = {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
  };
  next();
}