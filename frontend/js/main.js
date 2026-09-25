import { APP_CONFIG } from "./config.js";

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
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    return;
  }

  if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }

  button.disabled = false;
  button.removeAttribute("aria-busy");
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

function initializeFrontend() {
  document.documentElement.dataset.app = APP_CONFIG.name;
  updateCurrentYear();
  markCurrentNavigationLink();

  document.dispatchEvent(
    new CustomEvent("nestleERP:ready", {
      detail: {
        appName: APP_CONFIG.name,
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
