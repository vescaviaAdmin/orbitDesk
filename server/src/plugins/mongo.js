import fp from "fastify-plugin";
import { connectMongo, disconnectMongo } from "../config/mongoConnector.js";

async function mongoPlugin(fastify, options) {
  const mongo = await connectMongo({
    mongoUri: options.mongoUri,
    dbName: options.dbName,
    logger: fastify.log,
  });

  fastify.decorate("mongo", {
    mongoose: mongo.mongoose,
    connection: mongo.connection,
  });

  fastify.addHook("onClose", async () => {
    await disconnectMongo(fastify.log);
  });
}

export default fp(mongoPlugin, {
  name: "mongo-plugin",
});
