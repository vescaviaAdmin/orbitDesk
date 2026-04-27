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
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Request", requestSchema);
