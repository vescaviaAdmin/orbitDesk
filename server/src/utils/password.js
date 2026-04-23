import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashSecret(value) {
  return bcrypt.hash(value, SALT_ROUNDS);
}

export function compareSecret(value, hash) {
  if (!hash) {
    return false;
  }

  return bcrypt.compare(value, hash);
}
