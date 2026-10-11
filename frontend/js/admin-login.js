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
import {
  NIGERIA_STATES,
} from "./nigeriaStates.js";

const ADMIN_ROLES = ["inventory-manager", "super-admin"];

const form = document.querySelector("#admin-login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const rememberInput = document.querySelector("#remember-me");
const loginButton = document.querySelector("#login-button");
const togglePasswordButton = document.querySelector("#toggle-password");
const messageContainer = document.querySelector("#login-message");
const temporaryPasswordDialog = document.querySelector("#temporary-password-change-dialog");
const temporaryPasswordForm = document.querySelector("#temporary-password-change-form");
const temporaryPasswordMessage = document.querySelector("#temporary-password-change-message");
const temporaryPasswordCancel = document.querySelector("#temporary-password-change-cancel");

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
    const loginResponse = await api.users.login(
      {
        email: emailInput.value.trim(),
        password: passwordInput.value,
      },
      {
        remember: rememberInput.checked,
      },
    );

    // A temporary password is intentionally not granted a normal session.
    // Prompt for a new password before checking the user's administrative role.
    if (loginResponse?.passwordChangeRequired) {
      temporaryPasswordForm.reset();
      temporaryPasswordForm.elements.email.value = emailInput.value.trim();
      temporaryPasswordForm.elements.currentPassword.value = passwordInput.value;
      temporaryPasswordMessage.hidden = true;
      temporaryPasswordMessage.textContent = "";
      passwordInput.value = "";
      temporaryPasswordDialog.showModal();
      return;
    }

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

temporaryPasswordForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = Object.fromEntries(new FormData(temporaryPasswordForm).entries());
  if (payload.newPassword !== payload.confirmPassword) {
    showPageMessage("New passwords do not match.", {
      type: "error",
      container: temporaryPasswordMessage,
    });
    return;
  }

  const submitButton = document.querySelector("#temporary-password-change-submit");
  setButtonLoading(submitButton, true, "Saving...");
  try {
    const response = await api.users.changePassword(payload, { requiresAuth: false });
    temporaryPasswordDialog.close();
    temporaryPasswordForm.reset();
    passwordInput.value = "";
    emailInput.value = payload.email;
    showPageMessage(
      response?.message || "Password changed successfully. Sign in with your new password.",
      { type: "success", container: messageContainer },
    );
    passwordInput.focus();
  } catch (error) {
    showPageMessage(
      error instanceof ApiError ? error.message : "Unable to change the temporary password.",
      { type: "error", container: temporaryPasswordMessage },
    );
  } finally {
    setButtonLoading(submitButton, false);
  }
});

temporaryPasswordCancel?.addEventListener("click", () => {
  temporaryPasswordDialog.close();
  temporaryPasswordForm.reset();
  passwordInput.value = "";
  passwordInput.focus();
});

// Keep the first-login prompt explicit if the user presses Escape.
temporaryPasswordDialog?.addEventListener("cancel", (event) => event.preventDefault());

const redirectedMessage = sessionStorage.getItem("nestleERP.adminLoginMessage");

if (redirectedMessage) {
  sessionStorage.removeItem("nestleERP.adminLoginMessage");
  showPageMessage(redirectedMessage, {
    type: "warning",
    container: messageContainer,
  });
}

const forgotOpen =
  document.querySelector(
    "#forgot-password-open",
  );

const bootstrapOpen =
  document.querySelector(
    "#bootstrap-admin-open",
  );

const forgotDialog =
  document.querySelector(
    "#forgot-password-dialog",
  );

const resetDialog =
  document.querySelector(
    "#reset-password-dialog",
  );

const bootstrapDialog =
  document.querySelector(
    "#bootstrap-admin-dialog",
  );

const forgotForm =
  document.querySelector(
    "#forgot-password-form",
  );

const resetForm =
  document.querySelector(
    "#reset-password-form",
  );

const bootstrapForm =
  document.querySelector(
    "#bootstrap-admin-form",
  );

const bootstrapLocation =
  document.querySelector(
    "#bootstrap-location",
  );


function populateBootstrapLocations() {
  NIGERIA_STATES.forEach(
    (state) => {
      const option =
        document.createElement(
          "option",
        );

      option.value =
        state;

      option.textContent =
        state;

      bootstrapLocation.appendChild(
        option,
      );
    },
  );
}


async function checkBootstrapStatus() {
  try {
    const response =
      await api.users
        .bootstrapStatus();

    bootstrapOpen.hidden =
      !response?.data?.available;

  } catch {
    bootstrapOpen.hidden =
      true;
  }
}


forgotOpen.addEventListener(
  "click",
  () => {
    forgotDialog.showModal();
  },
);


document
  .querySelector(
    "[data-close-forgot]",
  )
  .addEventListener(
    "click",
    () =>
      forgotDialog.close(),
  );


bootstrapOpen.addEventListener(
  "click",
  () => {
    bootstrapDialog.showModal();
  },
);


document
  .querySelector(
    "[data-close-bootstrap]",
  )
  .addEventListener(
    "click",
    () =>
      bootstrapDialog.close(),
  );


forgotForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const email =
      forgotForm.elements
        .email.value.trim();

    const container =
      document.querySelector(
        "#forgot-password-message",
      );

    try {
      const response =
        await api.users
          .forgotPassword(
            email,
          );

      showPageMessage(
        response?.message ||
          "If an account exists, a reset link has been sent.",
        {
          type: "success",
          container,
        },
      );

    } catch (error) {
      showPageMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to request password reset.",
        {
          type: "error",
          container,
        },
      );
    }
  },
);


bootstrapForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const values =
      Object.fromEntries(
        new FormData(
          bootstrapForm,
        ).entries(),
      );

    const container =
      document.querySelector(
        "#bootstrap-admin-message",
      );

    if (
      values.password !==
      values.confirmPassword
    ) {
      showPageMessage(
        "Passwords do not match.",
        {
          type: "error",
          container,
        },
      );

      return;
    }

    const bootstrapKey =
      values.bootstrapKey;

    delete values.bootstrapKey;
    delete values.confirmPassword;

    try {
      await api.users
        .bootstrapSuperAdmin(
          values,
          bootstrapKey,
        );

      /*
       * Log the newly created
       * Super Admin in immediately.
       */
      await api.users.login({
        email:
          values.email,

        password:
          values.password,
      });

      redirectToDashboard();

    } catch (error) {
      showPageMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to register Super Admin.",
        {
          type: "error",
          container,
        },
      );
    }
  },
);


const resetToken =
  new URLSearchParams(
    window.location.search,
  ).get(
    "resetToken",
  );


if (resetToken) {
  resetDialog.showModal();
}


resetForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const values =
      Object.fromEntries(
        new FormData(
          resetForm,
        ).entries(),
      );

    const container =
      document.querySelector(
        "#reset-password-message",
      );

    try {
      const response =
        await api.users
          .resetPassword(
            resetToken,
            values,
          );

      resetDialog.close();

      window.history.replaceState(
        {},
        "",
        window.location.pathname,
      );

      showPageMessage(
        response?.message ||
          "Password reset successfully. Please sign in.",
        {
          type: "success",
          container:
            messageContainer,
        },
      );

      passwordInput.focus();

    } catch (error) {
      showPageMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to reset password.",
        {
          type: "error",
          container,
        },
      );
    }
  },
);


populateBootstrapLocations();
checkBootstrapStatus();

if (isAuthenticated() && isAdministrativeUser()) {
  redirectToDashboard();
} else if (isAuthenticated()) {
  clearAuthSession();
}
