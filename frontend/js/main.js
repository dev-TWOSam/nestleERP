import { APP_CONFIG } from "./config.js";
import {
  clearAuthSession,
  getCurrentUser,
  isAuthenticated,
} from "./api.js";

/**
 * Shared DOM helpers used across frontend pages.
 */
export function select(selector, scope = document) {
  return scope.querySelector(selector);
}

export function selectAll(selector, scope = document) {
  return [...scope.querySelectorAll(selector)];
}

/**
 * Displays a reusable page-level message when a page provides an element with
 * `data-page-message`.
 */
export function showPageMessage(
  message,
  { type = "info", container = select("[data-page-message]") } = {},
) {
  if (!container) {
    return;
  }

  container.textContent = message;
  container.dataset.type = type;
  container.hidden = false;
  container.setAttribute("role", type === "error" ? "alert" : "status");
}

export function clearPageMessage(
  container = select("[data-page-message]"),
) {
  if (!container) {
    return;
  }

  container.textContent = "";
  container.removeAttribute("data-type");
  container.removeAttribute("role");
  container.hidden = true;
}

/**
 * Prevents repeated submissions while an asynchronous action is running.
 */
export function setButtonLoading(
  button,
  isLoading,
  loadingText = "Please wait...",
) {
  if (!button) {
    return;
  }

  if (isLoading) {
    if (!button.dataset.originalText) {
      button.dataset.originalText = button.textContent;
    }

    button.textContent = loadingText;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.classList.add("is-loading");
    return;
  }

  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }

  button.disabled = false;
  button.removeAttribute("aria-busy");
  button.classList.remove("is-loading");
}

/**
 * Applies the official shared logo to elements marked with `data-app-logo`.
 * A page may still provide its own src explicitly if needed.
 */
function initializeSharedLogo() {
  selectAll("[data-app-logo]").forEach((image) => {
    if (!image.getAttribute("src")) {
      image.src = APP_CONFIG.assets.logoUrl;
    }

    if (!image.getAttribute("alt")) {
      image.alt = `${APP_CONFIG.name} logo`;
    }

    image.classList.add("site-logo");
  });
}

function updateCurrentYear() {
  const currentYear = new Date().getFullYear();

  selectAll("[data-current-year]").forEach((element) => {
    element.textContent = currentYear;
  });
}

function markCurrentNavigationLink() {
  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";

  selectAll("[data-nav-link]").forEach((link) => {
    const linkUrl = new URL(link.href, window.location.href);
    const linkPath = linkUrl.pathname.replace(/\/$/, "") || "/";
    const isCurrent = linkPath === currentPath;

    link.classList.toggle("is-active", isCurrent);

    if (isCurrent) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

/**
 * Updates UI visibility from the stored JWT claims.
 * This controls presentation only; the backend still enforces authorization.
 *
 * Supported hooks:
 *   data-auth-only
 *   data-guest-only
 *   data-role="inventory-manager,super-admin"
 *   data-current-user-email
 */
function applyAuthenticationState() {
  const authenticated = isAuthenticated();
  const user = authenticated ? getCurrentUser() : null;

  document.documentElement.dataset.authenticated = String(authenticated);

  if (user?.role) {
    document.documentElement.dataset.userRole = user.role;
  } else {
    delete document.documentElement.dataset.userRole;
  }

  selectAll("[data-auth-only]").forEach((element) => {
    element.hidden = !authenticated;
  });

  selectAll("[data-guest-only]").forEach((element) => {
    element.hidden = authenticated;
  });

  selectAll("[data-role]").forEach((element) => {
    const allowedRoles = element.dataset.role
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);

    element.hidden = !user?.role || !allowedRoles.includes(user.role);
  });

  selectAll("[data-current-user-email]").forEach((element) => {
    element.textContent = user?.email || "";
  });
}

function initializeLogoutControls() {
  selectAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      clearAuthSession();
      applyAuthenticationState();

      document.dispatchEvent(new CustomEvent("nestleERP:logout"));
    });
  });
}

function initializeFrontend() {
  document.documentElement.dataset.app = APP_CONFIG.name;

  initializeSharedLogo();
  updateCurrentYear();
  markCurrentNavigationLink();
  applyAuthenticationState();
  initializeLogoutControls();

  document.dispatchEvent(
    new CustomEvent("nestleERP:ready", {
      detail: {
        appName: APP_CONFIG.name,
        authenticated: isAuthenticated(),
        user: getCurrentUser(),
      },
    }),
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeFrontend, {
    once: true,
  });
} else {
  initializeFrontend();
}
