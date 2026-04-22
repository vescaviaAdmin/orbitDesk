import { v2 as cloudinary } from "cloudinary";
import env from "../config/env.js";

function getCloudinaryConfig(url) {
  const parsedUrl = new URL(url);

  return {
    cloud_name: parsedUrl.hostname,
    api_key: decodeURIComponent(parsedUrl.username),
    api_secret: decodeURIComponent(parsedUrl.password),
    secure: true,
  };
}

if (env.cloudinaryUrl) {
  cloudinary.config(getCloudinaryConfig(env.cloudinaryUrl));
}

export async function uploadFileToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: file.folder,
        resource_type: "auto",
        public_id: `${Date.now()}-${file.fileName.replace(/\s+/g, "-")}`,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          originalName: file.fileName,
          mimeType: file.mimeType,
          size: file.buffer.length,
          uploadedAt: result.created_at,
        });
      }
    );

    upload.end(file.buffer);
  });
}
