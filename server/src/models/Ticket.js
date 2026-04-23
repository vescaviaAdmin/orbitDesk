import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
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
    urls: [
      {
        type: String,
        trim: true,
      },
    ],
    deadline: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Ticket", ticketSchema);
