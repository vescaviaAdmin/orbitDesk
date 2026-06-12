import { createSessionToken } from "../../../utils/tokens.js";

export function buildSessionResponse({ account, role, redirectTo, appUrl, displayName }) {
  const response = {
    token: createSessionToken({ sub: account.id, role }),
    role,
    redirectTo,
    user: {
      id: account.id,
      name: displayName,
      email: account.email,
    },
  };

  if (appUrl) {
    response.appUrl = appUrl;
  }

  return response;
}
