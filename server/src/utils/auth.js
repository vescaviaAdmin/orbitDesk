import crypto from "node:crypto";

export function createRandomToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");

  return {
    salt,
    hash,
  };
}

export function verifyPassword(password, salt, hash) {
  const derivedHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(derivedHash), Buffer.from(hash));
}

export function isEmail(value) {
  return typeof value === "string" && value.includes("@");
}
