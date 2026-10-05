/**
 * Shared frontend configuration for nestleERP.
 *
 * Keep environment-specific values and backend endpoint paths here so feature
 * files never need to hardcode API URLs.
 */

const DEFAULT_API_ORIGIN = "http://localhost:4001";

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
  roles: Object.freeze({
    user: "user",
    inventoryManager: "inventory-manager",
    superAdmin: "super-admin",
  }),
});

export const API_BASE_URL = `${APP_CONFIG.apiOrigin}${APP_CONFIG.apiPrefix}`;

/**
 * Endpoint map based on the backend routes currently implemented in this
 * repository.
 */
export const API_ENDPOINTS = Object.freeze({
  health: `${APP_CONFIG.apiOrigin}/health`,

  products: `${API_BASE_URL}/products`,

  productCategories:
    `${API_BASE_URL}/products/categories`,

  productById: (productId) =>
    `${API_BASE_URL}/products/${encodeURIComponent(productId)}`,

  productsByCategory: (category) =>
    `${API_BASE_URL}/products/categories/${encodeURIComponent(category)}`,

  users: `${API_BASE_URL}/users`,
  userLogin: `${API_BASE_URL}/users/login`,
});
