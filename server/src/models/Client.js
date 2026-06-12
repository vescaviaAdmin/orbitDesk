import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    agreementDocument: {
      url: String,
      publicId: String,
      originalName: String,
      mimeType: String,
      bytes: Number,
      uploadedAt: Date,
    },
    passwordHash: {
      type: String,
      default: "",
    },
    passwordSetTokenHash: String,
    passwordSetTokenExpiresAt: Date,
    onboardedAt: Date,
    passwordSetAt: Date,
    status: {
      type: String,
      enum: ["invited", "active"],
      default: "invited",
    },
    otp: {
      codeHash: String,
      expiresAt: Date,
      verifiedAt: Date,
    },
    ownerAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

clientSchema.index({ ownerAdmin: 1, createdAt: -1 });
clientSchema.index({ ownerAdmin: 1, status: 1, createdAt: -1 });
clientSchema.index({ ownerAdmin: 1, email: 1 });

export default mongoose.model("Client", clientSchema);
