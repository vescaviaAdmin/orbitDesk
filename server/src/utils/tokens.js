import crypto from "crypto";
import jwt from "jsonwebtoken";
import env from "../config/env.js";

export function createNumericOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

export function createSecureToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function createSessionToken(payload) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: "8h",
  });
}
