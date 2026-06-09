export function getPortalSession() {
  return JSON.parse(localStorage.getItem("orbitdesk_session") || "{}");
}

export function clearPortalSession() {
  localStorage.removeItem("orbitdesk_session");
}

export function redirectToPortalLogin() {
  if (typeof window === "undefined") {
    return;
  }

  window.location.replace("/");
}

export function handlePortalAuthFailure() {
  clearPortalSession();
  redirectToPortalLogin();
}

export function isSessionExpiredError(error) {
  return error?.message === "Session expired";
}
