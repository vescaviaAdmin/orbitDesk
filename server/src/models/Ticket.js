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
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    type: {
      type: String,
      enum: ["bug", "feature", "task", "improvement"],
      default: "task",
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
      default: null,
    },
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    sprint: {
      phaseIndex: {
        type: Number,
        default: -1,
      },
      phaseName: {
        type: String,
        trim: true,
        default: "",
      },
      sprintIndex: {
        type: Number,
        default: -1,
      },
      sprintName: {
        type: String,
        trim: true,
        default: "",
      },
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
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

export default mongoose.model("Ticket", ticketSchema);
