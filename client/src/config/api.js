const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const SIGNUP_API_PATH =
  import.meta.env.VITE_SIGNUP_API_PATH || "/api/clients/signup";
const SET_PASSWORD_API_PATH =
  import.meta.env.VITE_SET_PASSWORD_API_PATH || "/api/clients/set-password";
const REQUEST_OTP_API_PATH =
  import.meta.env.VITE_REQUEST_OTP_API_PATH || "/api/clients/login/request-otp";
const VERIFY_OTP_API_PATH =
  import.meta.env.VITE_VERIFY_OTP_API_PATH || "/api/clients/login/verify-otp";

export const API_ROUTES = {
  health: `${API_BASE_URL}/health`,
  signup: `${API_BASE_URL}${SIGNUP_API_PATH}`,
  setPassword: `${API_BASE_URL}${SET_PASSWORD_API_PATH}`,
  requestOtp: `${API_BASE_URL}${REQUEST_OTP_API_PATH}`,
  verifyOtp: `${API_BASE_URL}${VERIFY_OTP_API_PATH}`,
};

async function parseResponse(response) {
  const data = await response.json().catch(() => ({
    message: "Unexpected server response",
  }));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export async function signupClient(formData) {
  const response = await fetch(API_ROUTES.signup, {
    method: "POST",
    body: formData,
  });

  return parseResponse(response);
}

export async function setClientPassword(payload) {
  const response = await fetch(API_ROUTES.setPassword, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function requestLoginOtp(payload) {
  const response = await fetch(API_ROUTES.requestOtp, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function verifyLoginOtp(payload) {
  const response = await fetch(API_ROUTES.verifyOtp, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseResponse(response);
}

export async function fetchHealth() {
  const response = await fetch(API_ROUTES.health);

  if (!response.ok) {
    throw new Error("Server not reachable");
  }

  return response.json();
}
