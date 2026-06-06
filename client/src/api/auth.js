const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export function requestClientOtp(credentials) {
  return request("/auth/client/request-otp", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function loginWithCredentials(credentials) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function loginClient(credentials) {
  return request("/auth/client/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function loginMember(credentials) {
  return request("/auth/member/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function forgotMemberPassword(email) {
  return request("/auth/member/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
