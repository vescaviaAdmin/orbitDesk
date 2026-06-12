import mongoose from "mongoose";

const requestSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "reviewing", "closed"],
      default: "open",
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

requestSchema.index({ ownerAdmin: 1, createdAt: -1 });
requestSchema.index({ ownerAdmin: 1, project: 1, createdAt: -1 });
requestSchema.index({ ownerAdmin: 1, createdBy: 1, createdAt: -1 });

export default mongoose.model("Request", requestSchema);
