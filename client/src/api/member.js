import { getPortalSession, handlePortalAuthFailure } from "../lib/session";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");

async function request(path, options = {}) {
  const session = getPortalSession();
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.token || ""}`,
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    handlePortalAuthFailure();
    throw new Error("Session expired");
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export function listMemberProjects() {
  return request("/member/projects");
}

export function getMemberWorkspaceSummary() {
  return request("/member/workspace-summary");
}

export function getMemberSkills() {
  return request("/member/skills");
}

export function updateMemberSkills(payload) {
  return request("/member/skills", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getMemberProject(projectId) {
  return request(`/member/projects/${projectId}`);
}

export function listMemberTickets() {
  return request("/member/tickets");
}

export function getMemberTicket(ticketId) {
  return request(`/member/tickets/${ticketId}`);
}

export function raiseTicket(projectId, ticket) {
  return request(`/member/projects/${projectId}/tickets`, {
    method: "POST",
    body: JSON.stringify(ticket),
  });
}

export function raiseRequest(projectId, payload) {
  return request(`/member/projects/${projectId}/requests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function addMemberProjectResources(projectId, resources) {
  return request(`/member/projects/${projectId}/resources`, {
    method: "POST",
    body: JSON.stringify({ resources }),
  });
}

export function updateMemberTicketStatus(ticketId, status) {
  return request(`/member/tickets/${ticketId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export function updateMemberTicket(ticketId, ticket) {
  return request(`/member/tickets/${ticketId}`, {
    method: "PUT",
    body: JSON.stringify(ticket),
  });
}
