import cloudinary, { ensureCloudinaryConfigured } from "../../config/cloudinary.js";
import env from "../../config/env.js";

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });

    stream.end(buffer);
  });
}

export async function uploadAgreementDocument(fastify, file) {
  ensureCloudinaryConfigured(fastify);

  const buffer = file.buffer || (await file.toBuffer());
  const result = await uploadBuffer(buffer, {
    folder: env.cloudinary.agreementFolder,
    resource_type: "raw",
    use_filename: true,
    unique_filename: true,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    originalName: file.filename,
    mimeType: file.mimetype,
    bytes: result.bytes,
    uploadedAt: new Date(),
  };
}
