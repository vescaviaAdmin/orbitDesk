import mongoose from "mongoose";

export async function connectMongo({ mongoUri, dbName, logger }) {
  logger?.info("Connecting to MongoDB with Mongoose");

  await mongoose.connect(mongoUri, {
    dbName,
  });

  logger?.info("Mongoose connected to MongoDB");

  return {
    mongoose,
    connection: mongoose.connection,
  };
}

export async function disconnectMongo(logger) {
  logger?.info("Closing Mongoose connection");
  await mongoose.connection.close();
}
