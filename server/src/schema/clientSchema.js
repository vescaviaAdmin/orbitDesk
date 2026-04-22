import mongoose from "mongoose";

export const clientFields = [
  "clientName",
  "companyName",
  "companyLocation",
  "companyWebsite",
  "projectName",
  "username",
  "email",
];

export function validateClientSignupFields(fields) {
  for (const fieldName of clientFields) {
    if (typeof fields[fieldName] !== "string" || !fields[fieldName].trim()) {
      return `${fieldName} is required`;
    }
  }

  return null;
}

const clientSchema = new mongoose.Schema(
  {
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    companyLocation: {
      type: String,
      required: true,
      trim: true,
    },
    companyWebsite: {
      type: String,
      required: true,
      trim: true,
    },
    projectName: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    documents: {
      signedAgreementCopyUrl: {
        type: String,
        required: true,
        trim: true,
      },
      signedAgreementCopyPublicId: {
        type: String,
        required: true,
        trim: true,
      },
      govIdUrl: {
        type: String,
        required: true,
        trim: true,
      },
      govIdPublicId: {
        type: String,
        required: true,
        trim: true,
      },
    },
    auth: {
      passwordHash: {
        type: String,
        default: "",
      },
      passwordSalt: {
        type: String,
        default: "",
      },
      passwordSetupTokenHash: {
        type: String,
        default: "",
      },
      passwordSetupExpiresAt: {
        type: Date,
        default: null,
      },
      passwordSetAt: {
        type: Date,
        default: null,
      },
      loginOtpHash: {
        type: String,
        default: "",
      },
      loginOtpExpiresAt: {
        type: Date,
        default: null,
      },
      pendingLoginAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    collection: "clients",
    timestamps: true,
  }
);

clientSchema.index({ username: 1 }, { unique: true });
clientSchema.index({ email: 1 }, { unique: true });

const Client =
  mongoose.models.Client || mongoose.model("Client", clientSchema);

export default Client;
