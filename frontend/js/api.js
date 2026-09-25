import {
  API_ENDPOINTS,
  APP_CONFIG,
} from "./config.js";

/**
 * Error type used for failed API requests.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, data = null, cause = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.cause = cause;
  }
}

function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.sessionStorage.getItem(APP_CONFIG.storageKeys.accessToken) ||
    window.localStorage.getItem(APP_CONFIG.storageKeys.accessToken)
  );
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => searchParams.append(key, item));
      return;
    }

    searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text || null;
}

function getErrorMessage(data, fallback) {
  if (!data) {
    return fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  return data.message || data.error || fallback;
}

/**
 * Reusable Fetch wrapper for all frontend API calls.
 */
export async function apiRequest(
  url,
  {
    method = "GET",
    body,
    headers = {},
    requiresAuth = false,
    timeoutMs = APP_CONFIG.requestTimeoutMs,
  } = {},
) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  const requestHeaders = new Headers({
    Accept: "application/json",
    ...headers,
  });

  if (requiresAuth) {
    const accessToken = getStoredAccessToken();

    if (accessToken) {
      requestHeaders.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  let requestBody = body;

  if (
    body !== undefined &&
    body !== null &&
    !(body instanceof FormData) &&
    typeof body !== "string"
  ) {
    requestHeaders.set("Content-Type", "application/json");
    requestBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal,
    });

    const data = await parseResponse(response);

    if (!response.ok) {
      throw new ApiError(
        getErrorMessage(
          data,
          `Request failed with status ${response.status}.`,
        ),
        {
          status: response.status,
          data,
        },
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new ApiError("The request timed out. Please try again.", {
        status: 408,
        cause: error,
      });
    }

    throw new ApiError(
      "Unable to connect to the server. Check your connection and try again.",
      {
        cause: error,
      },
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * Session helpers. The backend login response shape is not final yet, so these
 * functions deliberately store values only when a feature explicitly calls them.
 */
export function saveAuthSession({ accessToken, user, remember = false }) {
  const storage = remember ? window.localStorage : window.sessionStorage;
  const otherStorage = remember ? window.sessionStorage : window.localStorage;

  otherStorage.removeItem(APP_CONFIG.storageKeys.accessToken);
  otherStorage.removeItem(APP_CONFIG.storageKeys.currentUser);

  if (accessToken) {
    storage.setItem(APP_CONFIG.storageKeys.accessToken, accessToken);
  }

  if (user) {
    storage.setItem(APP_CONFIG.storageKeys.currentUser, JSON.stringify(user));
  }
}

export function clearAuthSession() {
  [window.localStorage, window.sessionStorage].forEach((storage) => {
    storage.removeItem(APP_CONFIG.storageKeys.accessToken);
    storage.removeItem(APP_CONFIG.storageKeys.currentUser);
  });
}

export function getCurrentUser() {
  const rawUser =
    window.sessionStorage.getItem(APP_CONFIG.storageKeys.currentUser) ||
    window.localStorage.getItem(APP_CONFIG.storageKeys.currentUser);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
}

/**
 * Shared API surface.
 *
 * Only `health.check()` maps to an endpoint that currently exists in the
 * uploaded backend. Product and authentication methods are prepared for the
 * planned API contract and should be adjusted if the backend team finalizes
 * different paths or payloads.
 */
export const api = Object.freeze({
  health: Object.freeze({
    check: () => apiRequest(API_ENDPOINTS.health),
  }),

  products: Object.freeze({
    list: (params = {}) =>
      apiRequest(`${API_ENDPOINTS.products}${buildQueryString(params)}`),

    getById: (productId) =>
      apiRequest(`${API_ENDPOINTS.products}/${encodeURIComponent(productId)}`),

    create: (product) =>
      apiRequest(API_ENDPOINTS.products, {
        method: "POST",
        body: product,
        requiresAuth: true,
      }),

    update: (productId, updates) =>
      apiRequest(`${API_ENDPOINTS.products}/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        body: updates,
        requiresAuth: true,
      }),

    remove: (productId) =>
      apiRequest(`${API_ENDPOINTS.products}/${encodeURIComponent(productId)}`, {
        method: "DELETE",
        requiresAuth: true,
      }),
  }),

  auth: Object.freeze({
    login: (credentials) =>
      apiRequest(API_ENDPOINTS.authLogin, {
        method: "POST",
        body: credentials,
      }),
  }),
});
