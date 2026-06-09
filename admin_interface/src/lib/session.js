export function redirectToAdminLogin() {
  if (typeof window === "undefined") {
    return;
  }

  window.location.replace("/login");
}

export function handleAdminAuthFailure() {
  localStorage.removeItem("orbitdesk_admin_session");
  redirectToAdminLogin();
}

export function isSessionExpiredError(error) {
  return error?.message === "Session expired";
}
