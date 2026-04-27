import dotenv from "dotenv";

dotenv.config();

function parseAllowedOrigins(value, defaults) {
  const configuredOrigins = (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins.length > 0 ? configuredOrigins : defaults;
}

const env = {
  port: Number(process.env.PORT || 5000),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: process.env.JWT_SECRET || "change-this-secret",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  adminUrl: process.env.ADMIN_URL || "http://localhost:5174",
  adminApiSecret: process.env.ADMIN_API_SECRET || "change-this-admin-secret",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    agreementFolder: process.env.CLOUDINARY_AGREEMENT_FOLDER || "orbitdesk/agreements",
  },
  allowedOrigins: parseAllowedOrigins(process.env.ALLOWED_ORIGINS, [
    process.env.CLIENT_URL || "http://localhost:5173",
    process.env.ADMIN_URL || "http://localhost:5174",
    "http://localhost:4173",
    "http://localhost:4174",
  ]),
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "OrbitDesk <no-reply@orbitdesk.local>",
  },
};

export default env;
