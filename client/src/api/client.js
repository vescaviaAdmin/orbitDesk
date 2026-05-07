const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getSession() {
  return JSON.parse(localStorage.getItem("orbitdesk_session") || "{}");
}

async function request(path, options = {}) {
  const session = getSession();
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token || ""}`,
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

export function listClientProjects() {
  return request("/client/projects");
}

export function listClientIssues() {
  return request("/client/issues");
}

export function createClientIssue(projectId, payload) {
  return request(`/client/projects/${projectId}/issues`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
