import fastifySensible from "@fastify/sensible";

async function sensiblePlugin(fastify) {
  await fastify.register(fastifySensible);
}

export default sensiblePlugin;
