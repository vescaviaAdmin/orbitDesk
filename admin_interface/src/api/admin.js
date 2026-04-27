const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function getAdminSecret() {
  return localStorage.getItem("orbitdesk_admin_secret") || "";
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const { headers = {}, ...requestOptions } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      "x-admin-secret": getAdminSecret(),
      ...headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export function addMember(member) {
  return request("/admin/members", {
    method: "POST",
    body: JSON.stringify(member),
  });
}

export function verifyAdminSecret(secret) {
  return request("/admin/session", {
    headers: {
      "x-admin-secret": secret,
    },
  });
}

export function listMembers() {
  return request("/admin/members");
}

export function addClient(client) {
  const formData = new FormData();
  formData.append("name", client.name);
  formData.append("email", client.email);
  formData.append("company", client.company || "");
  formData.append("phone", client.phone || "");
  formData.append("agreement", client.agreement);

  return request("/admin/clients", {
    method: "POST",
    body: formData,
  });
}

export function listClients() {
  return request("/admin/clients");
}

export function addProject(project) {
  return request("/admin/projects", {
    method: "POST",
    body: JSON.stringify(project),
  });
}

export function listProjects() {
  return request("/admin/projects");
}

export function listRequests() {
  return request("/admin/requests");
}

export function listIssues() {
  return request("/admin/issues");
}

export function getProject(projectId) {
  return request(`/admin/projects/${projectId}`);
}

export function updateProjectMembers(projectId, memberIds) {
  return request(`/admin/projects/${projectId}/members`, {
    method: "PUT",
    body: JSON.stringify({ memberIds }),
  });
}

export async function setPassword(role, payload) {
  const response = await fetch(`${API_URL}/auth/${role}/set-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}
