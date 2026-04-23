import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    clientEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["planned", "active", "paused", "completed"],
      default: "planned",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member",
      },
    ],
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Project", projectSchema);
