import mongoose from "mongoose";

const issueSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
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
    status: {
      type: String,
      enum: ["open", "reviewing", "resolved"],
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

issueSchema.index({ ownerAdmin: 1, createdAt: -1 });
issueSchema.index({ ownerAdmin: 1, project: 1, createdAt: -1 });
issueSchema.index({ ownerAdmin: 1, client: 1, createdAt: -1 });

export default mongoose.model("Issue", issueSchema);
