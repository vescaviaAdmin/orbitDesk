import mongoose from "mongoose";
import env from "./env.js";

async function connectDatabase(app) {
  if (!env.mongoUri) {
    app.log.warn("MONGO_URI is not set. Database-backed routes will fail until it is configured.");
    return;
  }

  await mongoose.connect(env.mongoUri);
  app.log.info("MongoDB connected");
}

export default connectDatabase;
