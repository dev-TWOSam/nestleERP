import {
  api,
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

const ADMIN_ROLES = ["inventory-manager", "super-admin"];

const form = document.querySelector("#admin-login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const rememberInput = document.querySelector("#remember-me");
const loginButton = document.querySelector("#login-button");
const togglePasswordButton = document.querySelector("#toggle-password");
const messageContainer = document.querySelector("#login-message");

function redirectToDashboard() {
  window.location.replace("./dashboard.html");
}

function isAdministrativeUser() {
  return hasRole(...ADMIN_ROLES);
}

function clearFieldError(fieldName) {
  const input = form.elements[fieldName];
  const error = form.querySelector(`[data-error-for="${fieldName}"]`);

  input?.removeAttribute("aria-invalid");

  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
}

function setFieldError(fieldName, message) {
  const input = form.elements[fieldName];
  const error = form.querySelector(`[data-error-for="${fieldName}"]`);

  input?.setAttribute("aria-invalid", "true");

  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
}

function validateForm() {
  let valid = true;
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  clearFieldError("email");
  clearFieldError("password");

  if (!email) {
    setFieldError("email", "Enter your email address.");
    valid = false;
  } else if (!emailInput.validity.valid) {
    setFieldError("email", "Enter a valid email address.");
    valid = false;
  }

  if (!password) {
    setFieldError("password", "Enter your password.");
    valid = false;
  }

  return valid;
}

async function handleLogin(event) {
  event.preventDefault();
  clearPageMessage(messageContainer);

  if (!validateForm()) {
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  setButtonLoading(loginButton, true, "Signing in...");

  try {
    await api.users.login(
      {
        email: emailInput.value.trim(),
        password: passwordInput.value,
      },
      {
        remember: rememberInput.checked,
      },
    );

    const user = getCurrentUser();

    if (!user || !ADMIN_ROLES.includes(user.role)) {
      clearAuthSession();

      showPageMessage(
        "This account does not have administrative access. Use an Inventory Manager or Super Admin account.",
        {
          type: "error",
          container: messageContainer,
        },
      );

      passwordInput.value = "";
      passwordInput.focus();
      return;
    }

    showPageMessage("Login successful. Opening your dashboard...", {
      type: "success",
      container: messageContainer,
    });

    redirectToDashboard();
  } catch (error) {
    showPageMessage(
      error instanceof ApiError
        ? error.message
        : "Unable to sign in. Please try again.",
      {
        type: "error",
        container: messageContainer,
      },
    );
  } finally {
    setButtonLoading(loginButton, false);
  }
}

function handlePasswordToggle() {
  const showingPassword = passwordInput.type === "text";

  passwordInput.type = showingPassword ? "password" : "text";
  togglePasswordButton.textContent = showingPassword ? "Show" : "Hide";
  togglePasswordButton.setAttribute("aria-pressed", String(!showingPassword));
}

[emailInput, passwordInput].forEach((input) => {
  input.addEventListener("input", () => clearFieldError(input.name));
});

form.addEventListener("submit", handleLogin);
togglePasswordButton.addEventListener("click", handlePasswordToggle);

const redirectedMessage = sessionStorage.getItem("nestleERP.adminLoginMessage");

if (redirectedMessage) {
  sessionStorage.removeItem("nestleERP.adminLoginMessage");
  showPageMessage(redirectedMessage, {
    type: "warning",
    container: messageContainer,
  });
}

if (isAuthenticated() && isAdministrativeUser()) {
  redirectToDashboard();
} else if (isAuthenticated()) {
  clearAuthSession();
}
