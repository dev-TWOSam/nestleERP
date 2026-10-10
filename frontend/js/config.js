/**
 * Shared frontend configuration for nestleERP.
 *
 * Keep environment-specific values and backend endpoint paths here so feature
 * files never need to hardcode API URLs.
 */

const DEFAULT_API_ORIGIN =
  "https://nestleerp.onrender.com";

const runtimeConfig =
  typeof window !== "undefined" &&
  window.NESTLE_ERP_CONFIG
    ? window.NESTLE_ERP_CONFIG
    : {};


/**
 * Remove trailing slashes from URLs.
 *
 * Example:
 * http://localhost:4001/
 * becomes:
 * http://localhost:4001
 */
function removeTrailingSlash(value) {
  return String(value).replace(/\/+$/, "");
}


export const APP_CONFIG =
  Object.freeze({
    name: "nestleERP",

    apiOrigin:
      removeTrailingSlash(
        runtimeConfig.API_ORIGIN ||
          DEFAULT_API_ORIGIN,
      ),

    apiPrefix: "/api",

    requestTimeoutMs: 10000,

    assets: Object.freeze({
      logoUrl:
        "https://res.cloudinary.com/xbezzyxi/image/upload/v1790303103/WhatsApp_Image_2026-09-24_at_6.19.18_PM.jpg",
    }),

    storageKeys: Object.freeze({
      accessToken:
        "nestleERP.accessToken",

      currentUser:
        "nestleERP.currentUser",
    }),

    roles: Object.freeze({
      user: "user",

      inventoryManager:
        "inventory-manager",

      superAdmin:
        "super-admin",
    }),
  });


/**
 * Base backend API URL.
 *
 * Result locally:
 * http://localhost:4001/api
 */
export const API_BASE_URL =
  `${APP_CONFIG.apiOrigin}${APP_CONFIG.apiPrefix}`;


/**
 * Backend endpoint map.
 */
export const API_ENDPOINTS =
  Object.freeze({
    // =====================================
    // HEALTH
    // =====================================

    health:
      `${APP_CONFIG.apiOrigin}/health`,


    // =====================================
    // PRODUCTS
    // =====================================

    products:
  `${API_BASE_URL}/products`,

productCategories:
  `${API_BASE_URL}/products/categories`,

productById: (productId) =>
  `${API_BASE_URL}/products/${encodeURIComponent(productId)}`,

productsByCategory: (category) =>
  `${API_BASE_URL}/products/categories/${encodeURIComponent(category)}`,

updateProduct: (productId) =>
  `${API_BASE_URL}/products/${encodeURIComponent(productId)}`,

deleteProduct: (productId) =>
  `${API_BASE_URL}/products/${encodeURIComponent(productId)}`,

      


    // =====================================
    // USERS
    // =====================================

    users:
      `${API_BASE_URL}/users`,

    userLogin:
      `${API_BASE_URL}/users/login`,

    staff:
      `${API_BASE_URL}/users/staff`,

    userById: (
      userId,
    ) =>
      `${API_BASE_URL}/users/${encodeURIComponent(
        userId,
      )}`,


    userBootstrapStatus:
      `${API_BASE_URL}/users/bootstrap/status`,

    userBootstrapSuperAdmin:
      `${API_BASE_URL}/users/bootstrap/super-admin`,

    userForgotPassword:
      `${API_BASE_URL}/users/password/forgot`,

    userResetPassword: (token) =>
      `${API_BASE_URL}/users/password/reset/${encodeURIComponent(token)}`,

    userChangePassword:
      `${API_BASE_URL}/users/password/change`,
  });
