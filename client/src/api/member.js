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

export function listMemberProjects() {
  return request("/member/projects");
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

export function updateMemberTicketStatus(ticketId, status) {
  return request(`/member/tickets/${ticketId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}
