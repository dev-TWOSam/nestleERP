/**
 * Shared frontend configuration for nestleERP.
 *
 * Keep environment-specific values and shared endpoint paths here so feature
 * files do not hardcode backend URLs throughout the application.
 */

const DEFAULT_API_ORIGIN = "http://localhost:5000";

const runtimeConfig =
  typeof window !== "undefined" && window.NESTLE_ERP_CONFIG
    ? window.NESTLE_ERP_CONFIG
    : {};

function removeTrailingSlash(value) {
  return String(value).replace(/\/+$/, "");
}

export const APP_CONFIG = Object.freeze({
  name: "nestleERP",
  apiOrigin: removeTrailingSlash(
    runtimeConfig.API_ORIGIN || DEFAULT_API_ORIGIN,
  ),
  apiPrefix: "/api",
  requestTimeoutMs: 10000,
  assets: Object.freeze({
    logoUrl:
      "https://res.cloudinary.com/xbezzyxi/image/upload/v1790303103/WhatsApp_Image_2026-09-24_at_6.19.18_PM.jpg",
  }),
  storageKeys: Object.freeze({
    accessToken: "nestleERP.accessToken",
    currentUser: "nestleERP.currentUser",
  }),
});

export const API_BASE_URL = `${APP_CONFIG.apiOrigin}${APP_CONFIG.apiPrefix}`;

/**
 * Shared endpoint map.
 *
 * `/health` exists in the current backend.
 * The `/api/...` paths reflect the frontend contract currently planned for the
 * project and must be confirmed against the backend implementation before final
 * integration.
 */
export const API_ENDPOINTS = Object.freeze({
  health: `${APP_CONFIG.apiOrigin}/health`,
  products: `${API_BASE_URL}/products`,
  authLogin: `${API_BASE_URL}/auth/login`,
});
