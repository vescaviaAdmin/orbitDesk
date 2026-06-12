import mongoose from "mongoose";

const planningTicketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },
    outcome: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const planningSprintSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    startDate: {
      type: String,
      default: "",
    },
    endDate: {
      type: String,
      default: "",
    },
    outcome: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["planned", "in_progress", "completed"],
      default: "planned",
    },
    tickets: [planningTicketSchema],
  },
  { _id: false },
);

const planningPhaseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    startDate: {
      type: String,
      default: "",
    },
    endDate: {
      type: String,
      default: "",
    },
    outcome: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["planned", "in_progress", "completed"],
      default: "planned",
    },
    sprints: [planningSprintSchema],
  },
  { _id: false },
);

const projectResourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    url: {
      type: String,
      trim: true,
      default: "",
    },
    addedByRole: {
      type: String,
      enum: ["admin", "member"],
      default: "admin",
    },
    addedByName: {
      type: String,
      trim: true,
      default: "",
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

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
    repositoryUrl: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
    clientCompany: {
      type: String,
      trim: true,
      default: "",
    },
    resources: [projectResourceSchema],
    planning: [planningPhaseSchema],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member",
      },
    ],
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

projectSchema.index({ ownerAdmin: 1, createdAt: -1 });
projectSchema.index({ ownerAdmin: 1, clientEmail: 1 });
projectSchema.index({ ownerAdmin: 1, members: 1 });
projectSchema.index({ ownerAdmin: 1, status: 1, createdAt: -1 });

export default mongoose.model("Project", projectSchema);
