function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeResources(resources = [], actor) {
  if (!Array.isArray(resources)) {
    return [];
  }

  return resources
    .map((resource) => ({
      name: String(resource?.name || "").trim(),
      url: String(resource?.url || "").trim(),
      addedByRole: actor.role,
      addedByName: actor.name,
      addedAt: new Date(),
    }))
    .filter((resource) => resource.name || resource.url);
}

export function validateResources(resources, fastify) {
  resources.forEach((resource, index) => {
    if (!resource.name) {
      throw fastify.httpErrors.badRequest(`resource ${index + 1} name is required`);
    }

    if (!resource.url) {
      throw fastify.httpErrors.badRequest(`resource ${index + 1} url is required`);
    }

    if (!isValidHttpUrl(resource.url)) {
      throw fastify.httpErrors.badRequest(`resource ${index + 1} must use a valid http or https URL`);
    }
  });
}
