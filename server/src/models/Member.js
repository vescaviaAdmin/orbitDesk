import mongoose from "mongoose";

const memberSchema = new mongoose.Schema(
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
    passwordHash: {
      type: String,
      default: "",
    },
    passwordSetTokenHash: String,
    passwordSetTokenExpiresAt: Date,
    invitedAt: Date,
    passwordSetAt: Date,
    status: {
      type: String,
      enum: ["invited", "active"],
      default: "invited",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Member", memberSchema);
