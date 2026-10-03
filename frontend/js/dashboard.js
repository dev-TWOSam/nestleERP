import { API_ENDPOINTS, APP_CONFIG } from "./config.js";
import {
  api,
  apiRequest,
  ApiError,
  clearAuthSession,
  getCurrentUser,
  hasRole,
  isAuthenticated,
} from "./api.js";
import {
  clearPageMessage,
  setButtonLoading,
  showPageMessage,
} from "./main.js";

const ADMIN_ROLES = [APP_CONFIG.roles.inventoryManager, APP_CONFIG.roles.superAdmin];
const SUPER_ADMIN_ROLE = APP_CONFIG.roles.superAdmin;

const dashboardMessage = document.querySelector("#dashboard-message");
const productCount = document.querySelector("#product-count");
const staffCount = document.querySelector("#staff-count");
const staffCountMeta = document.querySelector("#staff-count-meta");
const accessRole = document.querySelector("#access-role");
const accessDescription = document.querySelector("#access-description");
const topbarRole = document.querySelector("#topbar-role");
const dashboardWelcome = document.querySelector("#dashboard-welcome");
const permissionList = document.querySelector("#permission-list");
const sidebar = document.querySelector("#dashboard-sidebar");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const topbarLogout = document.querySelector("#topbar-logout");
const sidebarLogout = document.querySelector("#sidebar-logout");

const staffSearch = document.querySelector("#staff-search");
const includeUsers = document.querySelector("#include-users");
const refreshStaffButton = document.querySelector("#refresh-staff");
const staffTableBody = document.querySelector("#staff-table-body");
const staffLoading = document.querySelector("#staff-loading");
const staffEmpty = document.querySelector("#staff-empty");

const roleDialog = document.querySelector("#role-dialog");
const roleForm = document.querySelector("#role-form");
const roleDialogUser = document.querySelector("#role-dialog-user");
const roleUserId = document.querySelector("#role-user-id");
const roleSelect = document.querySelector("#role-select");
const roleSaveButton = document.querySelector("#role-save");
const roleDialogClose = document.querySelector("#role-dialog-close");
const roleCancel = document.querySelector("#role-cancel");

let users = [];
let currentUser = null;

function normalizeRole(role) {
  switch (role) {
    case APP_CONFIG.roles.superAdmin:
      return "Super Admin";
    case APP_CONFIG.roles.inventoryManager:
      return "Inventory Manager";
    default:
      return "User";
  }
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value ?? "";
  return element.innerHTML;
}

function userEndpoint(userId) {
  return `${API_ENDPOINTS.users}/${encodeURIComponent(userId)}`;
}

function redirectToLogin(message) {
  clearAuthSession();

  if (message) {
    sessionStorage.setItem("nestleERP.adminLoginMessage", message);
  }

  window.location.replace("./admin-login.html");
}

function requireAdministrativeAccess() {
  if (!isAuthenticated()) {
    redirectToLogin("Your session has expired. Please sign in again.");
    return false;
  }

  currentUser = getCurrentUser();

  if (!currentUser?.role || !ADMIN_ROLES.includes(currentUser.role)) {
    redirectToLogin("This account does not have administrative access.");
    return false;
  }

  return true;
}

function logout() {
  clearAuthSession();
  window.location.replace("./admin-login.html");
}

function setSidebarOpen(open) {
  sidebar.classList.toggle("is-open", open);
  sidebarToggle?.setAttribute("aria-expanded", String(open));
}

function renderRoleSummary() {
  const roleLabel = normalizeRole(currentUser.role);
  const isSuperAdmin = currentUser.role === SUPER_ADMIN_ROLE;

  topbarRole.textContent = roleLabel;
  accessRole.textContent = roleLabel;
  accessDescription.textContent = isSuperAdmin
    ? "Inventory and staff administration"
    : "Inventory management access";

  dashboardWelcome.textContent = isSuperAdmin
    ? "Manage inventory and review administrative staff access from one workspace."
    : "Manage product records and inventory operations available to Inventory Managers.";

  const permissions = isSuperAdmin
    ? [
        "View, create, update, and delete products.",
        "Review administrative staff accounts.",
        "Access Super Admin-only user management endpoints.",
        "Request staff role changes when backend role updates are enabled.",
      ]
    : [
        "View product records.",
        "Create new inventory products.",
        "Update existing product information.",
        "Delete products when required.",
      ];

  permissionList.innerHTML = permissions
    .map((permission) => `<li>${escapeHtml(permission)}</li>`)
    .join("");

  if (!isSuperAdmin) {
    staffCount.textContent = "Restricted";
    staffCountMeta.textContent = "Super Admin permission required";
  }
}

async function loadProductSummary() {
  try {
    const response = await api.products.list();
    const products = Array.isArray(response?.products) ? response.products : [];
    productCount.textContent = products.length.toLocaleString();
  } catch (error) {
    productCount.textContent = "—";

    if (!(error instanceof ApiError && error.status === 404)) {
      showPageMessage(
        error instanceof ApiError
          ? `Product summary: ${error.message}`
          : "Unable to load product summary.",
        {
          type: "warning",
          container: dashboardMessage,
        },
      );
    } else {
      productCount.textContent = "0";
    }
  }
}

function setStaffLoading(isLoading) {
  staffLoading.hidden = !isLoading;
  refreshStaffButton.disabled = isLoading;

  if (isLoading) {
    staffEmpty.hidden = true;
  }
}

function getVisibleUsers() {
  const query = staffSearch.value.trim().toLowerCase();
  const showStandardUsers = includeUsers.checked;

  return users.filter((user) => {
    const isStaff = ADMIN_ROLES.includes(user.role);

    if (!showStandardUsers && !isStaff) {
      return false;
    }

    if (!query) {
      return true;
    }

    const searchable = [
      user.firstName,
      user.lastName,
      user.email,
      user.role,
      user.location,
      user.phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(query);
  });
}

function renderStaffTable() {
  const visibleUsers = getVisibleUsers();

  staffTableBody.innerHTML = "";
  staffEmpty.hidden = visibleUsers.length !== 0;

  visibleUsers.forEach((user) => {
    const row = document.createElement("tr");
    const isCurrentAccount = user._id === currentUser?.id;
    const isAdmin = ADMIN_ROLES.includes(user.role);

    row.innerHTML = `
      <td>
        <div class="dashboard-table__name">
          <strong>${escapeHtml(`${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unnamed user")}</strong>
          <small>${isCurrentAccount ? "Current account" : escapeHtml(user.phone || "No phone")}</small>
        </div>
      </td>
      <td>${escapeHtml(user.email || "—")}</td>
      <td>
        <span class="dashboard-table__role ${user.role === APP_CONFIG.roles.user ? "dashboard-table__role--user" : ""}">
          ${escapeHtml(normalizeRole(user.role))}
        </span>
      </td>
      <td>${escapeHtml(user.location || "—")}</td>
      <td>
        <span class="dashboard-table__access ${user.HasAdminAccess || isAdmin ? "dashboard-table__access--yes" : "dashboard-table__access--no"}">
          ${user.HasAdminAccess || isAdmin ? "Yes" : "No"}
        </span>
      </td>
      <td>
        <div class="dashboard-table__actions">
          <button
            class="dashboard-table__action"
            type="button"
            data-role-user-id="${escapeHtml(user._id)}"
            ${isCurrentAccount ? "disabled title=\"You cannot change your own role from this screen.\"" : ""}
          >
            Manage role
          </button>
          <button
            class="dashboard-table__action dashboard-table__action--danger"
            type="button"
            data-delete-user-id="${escapeHtml(user._id)}"
            ${isCurrentAccount ? "disabled title=\"You cannot delete your own account from this screen.\"" : ""}
          >
            Delete
          </button>
        </div>
      </td>
    `;

    staffTableBody.appendChild(row);
  });
}

async function loadStaff() {
  if (!hasRole(SUPER_ADMIN_ROLE)) {
    return;
  }

  setStaffLoading(true);

  try {
    const response = await apiRequest(API_ENDPOINTS.users, {
      requiresAuth: true,
    });

    users = Array.isArray(response?.users) ? response.users : [];

    const administrativeStaff = users.filter((user) => ADMIN_ROLES.includes(user.role));
    staffCount.textContent = administrativeStaff.length.toLocaleString();
    staffCountMeta.textContent = "Super Admins and Inventory Managers";

    renderStaffTable();
  } catch (error) {
    users = [];
    staffTableBody.innerHTML = "";
    staffEmpty.hidden = true;
    staffCount.textContent = "—";

    if (error instanceof ApiError && error.status === 401) {
      redirectToLogin("Your session has expired. Please sign in again.");
      return;
    }

    showPageMessage(
      error instanceof ApiError ? error.message : "Unable to load staff accounts.",
      {
        type: "error",
        container: dashboardMessage,
      },
    );
  } finally {
    setStaffLoading(false);
  }
}

function openRoleDialog(userId) {
  const user = users.find((item) => item._id === userId);

  if (!user || user._id === currentUser?.id) {
    return;
  }

  roleUserId.value = user._id;
  roleSelect.value = user.role || APP_CONFIG.roles.user;
  roleDialogUser.textContent = `${user.firstName || ""} ${user.lastName || ""} · ${user.email || ""}`.trim();

  if (typeof roleDialog.showModal === "function") {
    roleDialog.showModal();
  }
}

function closeRoleDialog() {
  roleDialog.close();
  roleForm.reset();
  roleUserId.value = "";
}

async function saveRole(event) {
  event.preventDefault();

  const userId = roleUserId.value;
  const requestedRole = roleSelect.value;
  const user = users.find((item) => item._id === userId);

  if (!user || !ADMIN_ROLES.concat(APP_CONFIG.roles.user).includes(requestedRole)) {
    return;
  }

  setButtonLoading(roleSaveButton, true, "Saving...");
  clearPageMessage(dashboardMessage);

  try {
    const response = await apiRequest(userEndpoint(userId), {
      method: "PUT",
      requiresAuth: true,
      body: {
        role: requestedRole,
        HasAdminAccess: requestedRole !== APP_CONFIG.roles.user,
      },
    });

    if (response?.user?.role !== requestedRole) {
      showPageMessage(
        "The backend accepted the request but did not apply the role change. Update the protected user controller to persist role and HasAdminAccess before role assignment can work.",
        {
          type: "warning",
          container: dashboardMessage,
        },
      );
      closeRoleDialog();
      await loadStaff();
      return;
    }

    showPageMessage("Staff role updated successfully.", {
      type: "success",
      container: dashboardMessage,
    });

    closeRoleDialog();
    await loadStaff();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirectToLogin("Your session has expired. Please sign in again.");
      return;
    }

    showPageMessage(
      error instanceof ApiError ? error.message : "Unable to update the staff role.",
      {
        type: "error",
        container: dashboardMessage,
      },
    );
  } finally {
    setButtonLoading(roleSaveButton, false);
  }
}

async function deleteUser(userId) {
  const user = users.find((item) => item._id === userId);

  if (!user || user._id === currentUser?.id) {
    return;
  }

  const displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
  const confirmed = window.confirm(
    `Delete the account for ${displayName}? This permanently removes the user record and cannot be undone.`,
  );

  if (!confirmed) {
    return;
  }

  clearPageMessage(dashboardMessage);

  try {
    await apiRequest(userEndpoint(userId), {
      method: "DELETE",
      requiresAuth: true,
    });

    showPageMessage("User account deleted successfully.", {
      type: "success",
      container: dashboardMessage,
    });

    await loadStaff();
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirectToLogin("Your session has expired. Please sign in again.");
      return;
    }

    showPageMessage(
      error instanceof ApiError ? error.message : "Unable to delete the user account.",
      {
        type: "error",
        container: dashboardMessage,
      },
    );
  }
}

function handleStaffAction(event) {
  const roleButton = event.target.closest("[data-role-user-id]");
  const deleteButton = event.target.closest("[data-delete-user-id]");

  if (roleButton && !roleButton.disabled) {
    openRoleDialog(roleButton.dataset.roleUserId);
    return;
  }

  if (deleteButton && !deleteButton.disabled) {
    deleteUser(deleteButton.dataset.deleteUserId);
  }
}

function initializeDashboard() {
  if (!requireAdministrativeAccess()) {
    return;
  }

  renderRoleSummary();
  loadProductSummary();

  if (hasRole(SUPER_ADMIN_ROLE)) {
    loadStaff();
  }
}

sidebarToggle?.addEventListener("click", () => {
  setSidebarOpen(!sidebar.classList.contains("is-open"));
});

document.addEventListener("click", (event) => {
  if (
    window.innerWidth <= 780 &&
    sidebar.classList.contains("is-open") &&
    !sidebar.contains(event.target) &&
    !sidebarToggle.contains(event.target)
  ) {
    setSidebarOpen(false);
  }
});

topbarLogout.addEventListener("click", logout);
sidebarLogout.addEventListener("click", logout);
staffSearch.addEventListener("input", renderStaffTable);
includeUsers.addEventListener("change", renderStaffTable);
refreshStaffButton.addEventListener("click", loadStaff);
staffTableBody.addEventListener("click", handleStaffAction);
roleForm.addEventListener("submit", saveRole);
roleDialogClose.addEventListener("click", closeRoleDialog);
roleCancel.addEventListener("click", closeRoleDialog);
roleDialog.addEventListener("click", (event) => {
  if (event.target === roleDialog) {
    closeRoleDialog();
  }
});

initializeDashboard();
