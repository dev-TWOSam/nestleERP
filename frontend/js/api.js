import {
  API_ENDPOINTS,
  APP_CONFIG,
} from "./config.js";


/* =========================================
   API ERROR
========================================= */

export class ApiError extends Error {
  constructor(
    message,
    {
      status = 0,
      data = null,
      cause = null,
    } = {},
  ) {
    super(message);

    this.name = "ApiError";

    this.status = status;

    this.data = data;

    this.cause = cause;
  }
}


/* =========================================
   STORAGE
========================================= */

function getStorage(name) {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  return window[name];
}


/* =========================================
   ACCESS TOKEN
========================================= */

export function getStoredAccessToken() {
  const sessionStorage =
    getStorage("sessionStorage");

  const localStorage =
    getStorage("localStorage");

  return (
    sessionStorage?.getItem(
      APP_CONFIG.storageKeys.accessToken,
    ) ||
    localStorage?.getItem(
      APP_CONFIG.storageKeys.accessToken,
    ) ||
    null
  );
}


/* =========================================
   JWT DECODING
========================================= */

function decodeBase64Url(value) {
  const normalized =
    value
      .replace(/-/g, "+")
      .replace(/_/g, "/");

  const padded =
    normalized.padEnd(
      normalized.length +
        ((4 -
          (normalized.length % 4)) %
          4),
      "=",
    );

  return decodeURIComponent(
    Array.from(
      atob(padded),
    )
      .map(
        (character) =>
          `%${character
            .charCodeAt(0)
            .toString(16)
            .padStart(2, "0")}`,
      )
      .join(""),
  );
}


export function decodeAccessToken(
  token = getStoredAccessToken(),
) {
  if (
    !token ||
    typeof token !== "string"
  ) {
    return null;
  }

  try {
    const [, payload] =
      token.split(".");

    if (!payload) {
      return null;
    }

    return JSON.parse(
      decodeBase64Url(payload),
    );

  } catch {
    return null;
  }
}


/* =========================================
   AUTH SESSION
========================================= */

export function saveAuthSession({
  accessToken,
  user,
  remember = false,
}) {
  const localStorage =
    getStorage("localStorage");

  const sessionStorage =
    getStorage("sessionStorage");

  if (
    !localStorage ||
    !sessionStorage
  ) {
    return;
  }

  const storage =
    remember
      ? localStorage
      : sessionStorage;

  const otherStorage =
    remember
      ? sessionStorage
      : localStorage;

  otherStorage.removeItem(
    APP_CONFIG.storageKeys.accessToken,
  );

  otherStorage.removeItem(
    APP_CONFIG.storageKeys.currentUser,
  );

  if (accessToken) {
    storage.setItem(
      APP_CONFIG.storageKeys.accessToken,
      accessToken,
    );
  }

  const sessionUser =
    user ||
    decodeAccessToken(accessToken);

  if (sessionUser) {
    storage.setItem(
      APP_CONFIG.storageKeys.currentUser,
      JSON.stringify(
        sessionUser,
      ),
    );
  }
}


export function clearAuthSession() {
  const storages = [
    getStorage("localStorage"),
    getStorage("sessionStorage"),
  ];

  storages.forEach(
    (storage) => {
      if (!storage) {
        return;
      }

      storage.removeItem(
        APP_CONFIG.storageKeys.accessToken,
      );

      storage.removeItem(
        APP_CONFIG.storageKeys.currentUser,
      );
    },
  );
}


/* =========================================
   CURRENT USER
========================================= */

export function getCurrentUser() {
  const sessionStorage =
    getStorage("sessionStorage");

  const localStorage =
    getStorage("localStorage");

  const rawUser =
    sessionStorage?.getItem(
      APP_CONFIG.storageKeys.currentUser,
    ) ||
    localStorage?.getItem(
      APP_CONFIG.storageKeys.currentUser,
    );

  if (rawUser) {
    try {
      return JSON.parse(
        rawUser,
      );
    } catch {
      // Fall back to JWT claims.
    }
  }

  return decodeAccessToken();
}


/* =========================================
   AUTHENTICATION
========================================= */

export function isAuthenticated() {
  const token =
    getStoredAccessToken();

  const user =
    decodeAccessToken(token);

  if (
    !token ||
    !user
  ) {
    return false;
  }

  if (
    user.exp &&
    Date.now() >=
      user.exp * 1000
  ) {
    clearAuthSession();

    return false;
  }

  return true;
}


/* =========================================
   ROLE CHECK
========================================= */

export function hasRole(
  ...allowedRoles
) {
  const user =
    getCurrentUser();

  return Boolean(
    user?.role &&
      allowedRoles.includes(
        user.role,
      ),
  );
}


/* =========================================
   RESPONSE PARSER
========================================= */

async function parseResponse(
  response,
) {
  if (
    response.status === 204
  ) {
    return null;
  }

  const contentType =
    response.headers.get(
      "content-type",
    ) || "";

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    return response.json();
  }

  const text =
    await response.text();

  return text || null;
}


/* =========================================
   ERROR MESSAGE
========================================= */

function getErrorMessage(
  data,
  fallback,
) {
  if (!data) {
    return fallback;
  }

  if (
    typeof data === "string"
  ) {
    return data;
  }

  return (
    data.message ||
    data.error ||
    fallback
  );
}


/* =========================================
   MAIN API REQUEST
========================================= */

export async function apiRequest(
  url,
  {
    method = "GET",
    body,
    headers = {},
    requiresAuth = false,
    timeoutMs =
      APP_CONFIG.requestTimeoutMs,
  } = {},
) {
  const controller =
    new AbortController();

  const timeoutId =
    globalThis.setTimeout(
      () =>
        controller.abort(),
      timeoutMs,
    );

  const requestHeaders =
    new Headers({
      Accept:
        "application/json",

      ...headers,
    });


  /* =====================================
     AUTHORIZATION
  ===================================== */

  if (requiresAuth) {
    const accessToken =
      getStoredAccessToken();

    if (!accessToken) {
      globalThis.clearTimeout(
        timeoutId,
      );

      throw new ApiError(
        "Authentication required.",
        {
          status: 401,
        },
      );
    }

    requestHeaders.set(
      "Authorization",
      `Bearer ${accessToken}`,
    );
  }


  /* =====================================
     BODY HANDLING
  ===================================== */

  let requestBody = body;

  const isFormData =
    typeof FormData !==
      "undefined" &&
    body instanceof FormData;


  /*
    Only convert ordinary JavaScript
    objects to JSON.

    DO NOT manually set Content-Type
    when using FormData.

    The browser automatically adds:

    multipart/form-data; boundary=...
  */

  if (
    body !== undefined &&
    body !== null &&
    !isFormData &&
    typeof body !== "string"
  ) {
    requestHeaders.set(
      "Content-Type",
      "application/json",
    );

    requestBody =
      JSON.stringify(body);
  }


  /* =====================================
     FETCH
  ===================================== */

  try {
    const response =
      await fetch(
        url,
        {
          method,

          headers:
            requestHeaders,

          body:
            requestBody,

          signal:
            controller.signal,
        },
      );

    const data =
      await parseResponse(
        response,
      );


    /* ===================================
       API ERROR
    =================================== */

    if (!response.ok) {
      if (
        response.status === 401
      ) {
        clearAuthSession();
      }

      throw new ApiError(
        getErrorMessage(
          data,
          `Request failed with status ${response.status}.`,
        ),
        {
          status:
            response.status,

          data,
        },
      );
    }

    return data;

  } catch (error) {
    if (
      error instanceof ApiError
    ) {
      throw error;
    }

    if (
      error.name ===
      "AbortError"
    ) {
      throw new ApiError(
        "The request timed out. Please try again.",
        {
          status: 408,
          cause: error,
        },
      );
    }

    throw new ApiError(
      "Unable to connect to the server. Check your connection and try again.",
      {
        cause: error,
      },
    );

  } finally {
    globalThis.clearTimeout(
      timeoutId,
    );
  }
}


/* =========================================
   PRODUCT FORM DATA
========================================= */

function objectToProductFormData(
  product,
) {
  if (
    product instanceof FormData
  ) {
    return product;
  }

  const formData =
    new FormData();

  Object.entries(
    product || {},
  ).forEach(
    ([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        return;
      }

      formData.append(
        key,
        value,
      );
    },
  );

  return formData;
}


/* =========================================
   API
========================================= */

export const api =
  Object.freeze({

    /* -------------------------------------
       HEALTH
    ------------------------------------- */

    health:
      Object.freeze({
        check: () =>
          apiRequest(
            API_ENDPOINTS.health,
          ),
      }),


    /* -------------------------------------
       PRODUCTS
    ------------------------------------- */

    products:
  Object.freeze({

    /* =====================================
       LIST PRODUCTS
       Search + filters + sorting + pagination
    ===================================== */

    list: (filters = {}) => {
      const query =
        new URLSearchParams();

      Object.entries(
        filters,
      ).forEach(
        ([key, value]) => {
          if (
            value !== undefined &&
            value !== null &&
            value !== ""
          ) {
            query.set(
              key,
              String(value),
            );
          }
        },
      );

      const queryString =
        query.toString();

      const url =
        queryString
          ? `${API_ENDPOINTS.products}?${queryString}`
          : API_ENDPOINTS.products;

      return apiRequest(
        url,
      );
    },


    /* =====================================
       GET PRODUCT CATEGORIES
    ===================================== */

    categories: () =>
      apiRequest(
        API_ENDPOINTS.productCategories,
      ),


    /* =====================================
       GET PRODUCTS BY CATEGORY
    ===================================== */

    listByCategory:
      (category) =>
        apiRequest(
          API_ENDPOINTS.productsByCategory(
            category,
          ),
        ),


    /* =====================================
       GET SINGLE PRODUCT
    ===================================== */

    getById:
      (productId) =>
        apiRequest(
          API_ENDPOINTS.productById(
            productId,
          ),
        ),


    /* =====================================
       CREATE PRODUCT

       POST /api/products
       Authentication required.
       Uses FormData because products
       can include an image.
    ===================================== */

    create:
      (product) =>
        apiRequest(
          API_ENDPOINTS.products,
          {
            method:
              "POST",

            body:
              objectToProductFormData(
                product,
              ),

            requiresAuth:
              true,
          },
        ),


    /* =====================================
       UPDATE PRODUCT

       PUT /api/products/:id
       Authentication required.
    ===================================== */

    update:
      (
        productId,
        product,
      ) =>
        apiRequest(
          API_ENDPOINTS.productById(
            productId,
          ),
          {
            method:
              "PUT",

            body:
              objectToProductFormData(
                product,
              ),

            requiresAuth:
              true,
          },
        ),


    /* =====================================
       DELETE PRODUCT

       DELETE /api/products/:id
       Authentication required.
    ===================================== */

    remove:
      (productId) =>
        apiRequest(
          API_ENDPOINTS.productById(
            productId,
          ),
          {
            method:
              "DELETE",

            requiresAuth:
              true,
          },
        ),
  }),


  /* -------------------------------------
     USERS
  ------------------------------------- */

  users: Object.freeze({
    create: (user) =>
      apiRequest(
        API_ENDPOINTS.users,
        {
          method: "POST",
          body: user,
        },
      ),

    login: async (
      credentials,
      { remember = false } = {},
    ) => {
      const response = await apiRequest(
        API_ENDPOINTS.userLogin,
        {
          method: "POST",
          body: credentials,
        },
      );

      if (response?.token) {
        saveAuthSession({
          accessToken: response.token,
          remember,
        });
      }

      return response;
    },

    bootstrapStatus: () =>
      apiRequest(
        API_ENDPOINTS.userBootstrapStatus,
      ),

    bootstrapSuperAdmin: (
      user,
      bootstrapKey,
    ) =>
      apiRequest(
        API_ENDPOINTS.userBootstrapSuperAdmin,
        {
          method: "POST",
          headers: {
            "X-Bootstrap-Key": bootstrapKey,
          },
          body: user,
        },
      ),

    forgotPassword: (email) =>
      apiRequest(
        API_ENDPOINTS.userForgotPassword,
        {
          method: "POST",
          body: { email },
        },
      ),

    resetPassword: (token, passwords) =>
      apiRequest(
        API_ENDPOINTS.userResetPassword(token),
        {
          method: "POST",
          body: passwords,
        },
      ),

    changePassword: (passwords) =>
      apiRequest(
        API_ENDPOINTS.userChangePassword,
        {
          method: "PATCH",
          requiresAuth: true,
          body: passwords,
        },
      ),
  }),
});
