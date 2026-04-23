function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function sensiblePlugin(fastify) {
  fastify.decorate("httpErrors", {
    badRequest: (message = "Bad Request") => createHttpError(400, message),
    unauthorized: (message = "Unauthorized") => createHttpError(401, message),
    forbidden: (message = "Forbidden") => createHttpError(403, message),
    notFound: (message = "Not Found") => createHttpError(404, message),
    conflict: (message = "Conflict") => createHttpError(409, message),
  });
}

export default sensiblePlugin;
