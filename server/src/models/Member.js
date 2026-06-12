import mongoose from "mongoose";

const memberSkillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
  },
  { _id: false },
);

const memberCourseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },
    provider: {
      type: String,
      trim: true,
      default: "",
    },
    url: {
      type: String,
      trim: true,
      default: "",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

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
    skills: [memberSkillSchema],
    recommendedCourses: [memberCourseSchema],
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

memberSchema.index({ ownerAdmin: 1, createdAt: -1 });
memberSchema.index({ ownerAdmin: 1, status: 1, createdAt: -1 });

export default mongoose.model("Member", memberSchema);
