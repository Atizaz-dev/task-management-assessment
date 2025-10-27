
// src/api/getMembers.js
// const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const API_URL = import.meta.env.VITE_API_URL?.trim() || "https://teamflow-backend-1tt9.onrender.com";

/* ------------------------------------------
   Helper functions for auth headers & org ID
------------------------------------------- */
function authHeaders() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No token found — please log in again");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function getOrganizationId() {
  const orgId = localStorage.getItem("organizationId");
  if (!orgId) throw new Error("No organization ID found — please log in again");
  return parseInt(orgId);
}

/* ------------------------------------------
   ✅ 1. Get Accepted Members/Admins of Organization
   Endpoint: /auth/organization-members (from backend)
------------------------------------------- */
export async function getOrganizationMembers() {
  const organizationId = getOrganizationId();

  const res = await fetch(`${API_URL}/auth/organization-members?organization_id=${organizationId}`, {
    headers: authHeaders(),
  });

  const result = await res.json();

  if (!res.ok) {
    const msg = result.detail || result.message || "Failed to fetch organization members";
    throw new Error(msg);
  }

  // ✅ Filter to include only active (accepted) members & admins
  const accepted = result.filter(user => user.is_active === true);

  return accepted;
}

/* ------------------------------------------
   ✅ 2. Get Member/Admin Count Statistics
------------------------------------------- */
export async function getOrganizationMemberStats() {
  const members = await getOrganizationMembers();

  const stats = {
    total: members.length,
    admins: members.filter(u => u.role === "admin" || u.role === "super_admin").length,
    members: members.filter(u => u.role === "member").length,
  };

  return stats;
}




/* ------------------------------------------
   ✅ Refresh Dashboard Data After Drag
------------------------------------------- */
export async function refreshDashboardData() {
  try {
    const members = await getOrganizationMembers();
    const stats = await getOrganizationMemberStats();

    return {
      members,
      stats,
    };
  } catch (error) {
    console.error("Dashboard refresh failed:", error);
    return {
      members: [],
      stats: { total: 0, admins: 0, members: 0 },
    };
  }
}