import { handleAdminAuthFailure } from "../lib/session";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

export function getAdminSession() {
  return JSON.parse(localStorage.getItem("orbitdesk_admin_session") || "{}");
}

export function setAdminSession(session) {
  localStorage.setItem("orbitdesk_admin_session", JSON.stringify(session));
}

export function clearAdminSession() {
  localStorage.removeItem("orbitdesk_admin_session");
}

async function request(path, options = {}) {
  const session = getAdminSession();
  const isFormData = options.body instanceof FormData;
  const { headers = {}, ...requestOptions } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    handleAdminAuthFailure();
    throw new Error("Session expired");
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export function getStarted(email) {
  return request("/auth/admin/get-started", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function loginAdmin(credentials) {
  return request("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function forgotAdminPassword(email) {
  return request("/auth/admin/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function getAdminSessionStatus() {
  return request("/admin/session");
}

export function addMember(member) {
  return request("/admin/members", {
    method: "POST",
    body: JSON.stringify(member),
  });
}

export function listMembers() {
  return request("/admin/members");
}

export function getMemberDetail(memberId) {
  return request(`/admin/members/${memberId}`);
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

export function updateAdminRequestStatus(requestId, status) {
  return request(`/admin/requests/${requestId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export function listIssues() {
  return request("/admin/issues");
}

export function listTickets() {
  return request("/admin/tickets");
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

export function addProjectTicket(projectId, ticket) {
  return request(`/admin/projects/${projectId}/tickets`, {
    method: "POST",
    body: JSON.stringify(ticket),
  });
}

export function updateProjectTicket(ticketId, ticket) {
  return request(`/admin/tickets/${ticketId}`, {
    method: "PUT",
    body: JSON.stringify(ticket),
  });
}

export function addProjectResources(projectId, resources) {
  return request(`/admin/projects/${projectId}/resources`, {
    method: "POST",
    body: JSON.stringify({ resources }),
  });
}

export function updateSprintStatus(projectId, phaseIndex, sprintIndex, status) {
  return request(`/admin/projects/${projectId}/phases/${phaseIndex}/sprints/${sprintIndex}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
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
