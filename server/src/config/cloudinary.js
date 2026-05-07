import { v2 as cloudinary } from "cloudinary";
import env from "./env.js";

function configureCloudinary() {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

export function ensureCloudinaryConfigured(fastify) {
  if (!env.cloudinary.cloudName || !env.cloudinary.apiKey || !env.cloudinary.apiSecret) {
    throw fastify.httpErrors.badRequest("Cloudinary credentials are not configured");
  }

  configureCloudinary();
}

export default cloudinary;
