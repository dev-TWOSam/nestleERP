/* products.js - product listing: search, filter, sort, pagination
 *
 * DATA SOURCE: everything comes from the backend through js/api.js
 *   api.products.list(filters)   -> products + pagination
 *   api.products.categories()    -> category dropdown
 * Search, category, price, sorting and pagination are done by the SERVER.
 * Only "In stock only" is applied in the browser, on the current page.
 *
 * State is kept in the URL (?q=&category=&min=&max=&stock=&sort=&page=&limit=)
 * so the page can be refreshed, bookmarked and shared.
 */
/* products.js
 *
 * Public product listing:
 * - Search
 * - Category filtering
 * - Price filtering
 * - Stock filtering
 * - Sorting
 * - Pagination
 *
 * Backend APIs used:
 *   GET /api/products
 *   GET /api/products/categories
 */

import { api } from "./api.js";

(function () {
  "use strict";

  /* =========================================================
     PRODUCT NORMALIZER
  ========================================================= */

  function normalize(product) {
    let image = "";

    if (Array.isArray(product.images)) {
      image =
        product.images[0]?.url ||
        product.images[0] ||
        "";
    } else {
      image =
        product.image?.url ||
        product.image ||
        product.imageUrl ||
        product.thumbnail ||
        "";
    }

    const stock =
      product.stock ??
      product.quantity ??
      product.countInStock ??
      null;

    return {
      id:
        product._id ||
        product.id,

      name:
        product.name ||
        product.title ||
        "Untitled product",

      category:
        product.category ||
        "Uncategorized",

      description:
        product.description ||
        "",

      price:
        Number(product.price) ||
        0,

      stock:
        stock === null
          ? null
          : Number(stock),

      image,

      createdAt:
        product.createdAt
          ? new Date(
              product.createdAt,
            ).getTime()
          : 0,
    };
  }

  /* =========================================================
     PLACEHOLDER TILE COLOURS
  ========================================================= */

  const TILE_PALETTE = [
    "#0f5c4d",
    "#1565c0",
    "#b3261e",
    "#6a1b9a",
    "#e65100",
    "#00838f",
    "#5d4037",
    "#37474f",
    "#558b2f",
    "#ad1457",
  ];

  function categoryTile(
    category,
  ) {
    const key =
      category || "";

    let hash = 0;

    for (
      let i = 0;
      i < key.length;
      i++
    ) {
      hash =
        (
          hash * 31 +
          key.charCodeAt(i)
        ) >>> 0;
    }

    return `
      background:
        ${
          TILE_PALETTE[
            hash %
              TILE_PALETTE.length
          ]
        };
      color:#fff
    `;
  }

  /* =========================================================
     DEFAULT STATE
  ========================================================= */

  const DEFAULTS = {
    q: "",
    category: "",
    min: "",
    max: "",
    stock: false,
    sort: "newest",
    page: 1,
    limit: 12,
  };

  /* =========================================================
     DOM ELEMENTS
  ========================================================= */

  const $ = (id) =>
    document.getElementById(id);

  const el = {
    search:
      $("searchInput"),

    sort:
      $("sortSelect"),

    pageSize:
      $("pageSizeSelect"),

    categorySelect:
      $("categorySelect"),

    minPrice:
      $("minPrice"),

    maxPrice:
      $("maxPrice"),

    inStock:
      $("inStockOnly"),

    clear:
      $("clearFilters"),

    toggle:
      $("filtersToggle"),

    panel:
      $("filtersPanel"),

    chips:
      $("activeFilters"),

    grid:
      $("productGrid"),

    status:
      $("statusBox"),

    pagination:
      $("pagination"),

    summary:
      $("resultsSummary"),
  };

  /* =========================================================
     APPLICATION STATE
  ========================================================= */

  let allProducts = [];

  let paginationData = {
    page: 1,
    limit: 12,
    totalItems: 0,
    totalPages: 1,
  };

  let state =
    readStateFromUrl();

  /*
   * Used to prevent an older API
   * response replacing a newer
   * search result.
   */
  let requestId = 0;

  /* =========================================================
     HELPERS
  ========================================================= */

  const money =
    new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      },
    );

  function formatPrice(
    value,
  ) {
    return money.format(
      Number(value) || 0,
    );
  }

  function escapeHtml(
    value,
  ) {
    return String(
      value ?? "",
    ).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character],
    );
  }

  function debounce(
    callback,
    wait,
  ) {
    let timeout;

    return (...args) => {
      clearTimeout(timeout);

      timeout =
        setTimeout(
          () =>
            callback(
              ...args,
            ),
          wait,
        );
    };
  }

  /* =========================================================
     URL STATE
  ========================================================= */

  function readStateFromUrl() {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const numberValue = (
      value,
      defaultValue,
    ) => {
      const parsed =
        parseInt(
          value,
          10,
        );

      return Number.isFinite(
        parsed,
      ) &&
        parsed > 0
        ? parsed
        : defaultValue;
    };

    return {
      q:
        params.get("q") ||
        DEFAULTS.q,

      category:
        params.get(
          "category",
        ) || "",

      min:
        params.get("min") ||
        "",

      max:
        params.get("max") ||
        "",

      stock:
        params.get(
          "stock",
        ) === "1",

      sort:
        params.get(
          "sort",
        ) ||
        DEFAULTS.sort,

      page:
        numberValue(
          params.get(
            "page",
          ),
          1,
        ),

      limit:
        numberValue(
          params.get(
            "limit",
          ),
          DEFAULTS.limit,
        ),
    };
  }

  function writeStateToUrl() {
    const params =
      new URLSearchParams();

    if (state.q) {
      params.set(
        "q",
        state.q,
      );
    }

    if (
      state.category
    ) {
      params.set(
        "category",
        state.category,
      );
    }

    if (
      state.min !== ""
    ) {
      params.set(
        "min",
        state.min,
      );
    }

    if (
      state.max !== ""
    ) {
      params.set(
        "max",
        state.max,
      );
    }

    if (state.stock) {
      params.set(
        "stock",
        "1",
      );
    }

    if (
      state.sort !==
      DEFAULTS.sort
    ) {
      params.set(
        "sort",
        state.sort,
      );
    }

    if (
      state.page > 1
    ) {
      params.set(
        "page",
        state.page,
      );
    }

    if (
      state.limit !==
      DEFAULTS.limit
    ) {
      params.set(
        "limit",
        state.limit,
      );
    }

    const queryString =
      params.toString();

    history.replaceState(
      null,
      "",
      window.location
        .pathname +
        (
          queryString
            ? `?${queryString}`
            : ""
        ),
    );
  }

  /* =========================================================
     SYNC UI WITH STATE
  ========================================================= */

  function syncControlsFromState() {
    if (el.search) {
      el.search.value =
        state.q;
    }

    if (el.sort) {
      el.sort.value =
        state.sort;
    }

    if (el.pageSize) {
      el.pageSize.value =
        String(
          state.limit,
        );
    }

    if (
      el.categorySelect
    ) {
      el.categorySelect.value =
        state.category;
    }

    if (el.minPrice) {
      el.minPrice.value =
        state.min;
    }

    if (el.maxPrice) {
      el.maxPrice.value =
        state.max;
    }

    if (el.inStock) {
      el.inStock.checked =
        state.stock;
    }
  }

  /* =========================================================
     SORTING
  ========================================================= */

  function getSortParams() {
    const sortMap = {
      newest: {
        sortBy:
          "createdAt",
        sortOrder:
          "desc",
      },

      "name-asc": {
        sortBy:
          "name",
        sortOrder:
          "asc",
      },

      "name-desc": {
        sortBy:
          "name",
        sortOrder:
          "desc",
      },

      "price-asc": {
        sortBy:
          "price",
        sortOrder:
          "asc",
      },

      "price-desc": {
        sortBy:
          "price",
        sortOrder:
          "desc",
      },
    };

    return (
      sortMap[
        state.sort
      ] ||
      sortMap.newest
    );
  }

  /* =========================================================
     BUILD API FILTERS
  ========================================================= */

  function buildFilters() {
    const {
      sortBy,
      sortOrder,
    } =
      getSortParams();

    const filters = {
      sortBy,
      sortOrder,
      page:
        state.page,
      limit:
        state.limit,
    };

    const search =
      state.q.trim();

    if (search) {
      filters.search =
        search;
    }

    if (
      state.category
    ) {
      filters.category =
        state.category;
    }

    if (
      state.min !== ""
    ) {
      filters.minPrice =
        state.min;
    }

    if (
      state.max !== ""
    ) {
      filters.maxPrice =
        state.max;
    }

    return filters;
  }

  /* =========================================================
     CLIENT-SIDE STOCK FILTER

     Search, category, price,
     sorting and pagination are
     handled by the backend.

     Stock remains a local filter
     for now.
  ========================================================= */

  function applyFilters(
    products,
  ) {
    const search =
      state.q
        .trim()
        .toLowerCase();

    const min =
      state.min === ""
        ? null
        : Number(
            state.min,
          );

    const max =
      state.max === ""
        ? null
        : Number(
            state.max,
          );

    return products.filter(
      (product) => {
        const searchableText =
          [
            product.id,
            product.name,
            product.description,
            product.category,
          ]
            .filter(
              Boolean,
            )
            .join(" ")
            .toLowerCase();

        if (
          search &&
          !searchableText.includes(
            search,
          )
        ) {
          return false;
        }

        if (
          state.category &&
          product.category !==
            state.category
        ) {
          return false;
        }

        if (
          min !== null &&
          product.price <
            min
        ) {
          return false;
        }

        if (
          max !== null &&
          product.price >
            max
        ) {
          return false;
        }

        if (
          state.stock &&
          !(
            product.stock ===
              null ||
            product.stock >
              0
          )
        ) {
          return false;
        }

        return true;
      },
    );
  }

  /* =========================================================
     READ PAGINATION RESPONSE
  ========================================================= */

  function readPagination(
    response,
    productCount,
  ) {
    const raw =
      response?.data
        ?.pagination ||
      response?.pagination ||
      {};

    const limit =
      Number(
        raw.limit,
      ) ||
      state.limit;

    const totalItems =
      Number(
        raw.totalItems ??
          raw.total ??
          productCount,
      ) || 0;

    return {
      page:
        Number(
          raw.page,
        ) ||
        state.page,

      limit,

      totalItems,

      totalPages:
        Number(
          raw.totalPages,
        ) ||
        Math.max(
          1,
          Math.ceil(
            totalItems /
              limit,
          ),
        ),
    };
  }

  /* =========================================================
     STOCK BADGE
  ========================================================= */

  function stockBadge(
    product,
  ) {
    if (
      product.stock ===
      null
    ) {
      return "";
    }

    if (
      product.stock <=
      0
    ) {
      return `
        <span class="badge out">
          Out of stock
        </span>
      `;
    }

    if (
      product.stock <=
      10
    ) {
      return `
        <span class="badge">
          Only ${product.stock} left
        </span>
      `;
    }

    return "";
  }

  /* =========================================================
     PRODUCT CARD
  ========================================================= */

  function cardHtml(
    product,
  ) {
    const media =
      product.image
        ? `
          <img
            src="${escapeHtml(
              product.image,
            )}"
            alt="${escapeHtml(
              product.name,
            )}"
            loading="lazy"
          />
        `
        : `
          <div
            class="placeholder"
            style="${categoryTile(
              product.category,
            )}"
            aria-hidden="true"
          >
            ${escapeHtml(
              product.category,
            )}
          </div>
        `;

    return `
      <a
        class="card"
        href="product-details.html?id=${encodeURIComponent(
          product.id,
        )}"
      >

        <div
          class="card-media"
        >
          ${media}

          ${stockBadge(
            product,
          )}
        </div>

        <div
          class="card-body"
        >
          <h2
            class="card-title"
          >
            ${escapeHtml(
              product.name,
            )}
          </h2>

          <p
            class="card-cat"
          >
            ${escapeHtml(
              product.category,
            )}
          </p>

          ${
            product.description
              ? `
                <p
                  class="card-desc"
                >
                  ${escapeHtml(
                    product.description,
                  )}
                </p>
              `
              : ""
          }

          <p
            class="card-price"
          >
            ${formatPrice(
              product.price,
            )}
          </p>
        </div>

      </a>
    `;
  }

  /* =========================================================
     LOADING SKELETONS
  ========================================================= */

  function renderSkeletons(
    count,
  ) {
    el.grid.setAttribute(
      "aria-busy",
      "true",
    );

    el.grid.innerHTML =
      Array.from(
        {
          length:
            count,
        },
        () => `
          <div
            class="card skeleton"
            aria-hidden="true"
          >
            <div
              class="card-media"
            ></div>

            <div
              class="card-body"
            >
              <div
                class="line w60"
              ></div>

              <div
                class="line w90"
              ></div>

              <div
                class="line w60"
              ></div>
            </div>
          </div>
        `,
      ).join("");
  }

  /* =========================================================
     STATUS / ERROR MESSAGE
  ========================================================= */

  function showStatus(
    title,
    message,
    actionLabel,
    actionFunction,
  ) {
    el.status.hidden =
      false;

    el.status.innerHTML = `
      <h2>
        ${escapeHtml(
          title,
        )}
      </h2>

      <p>
        ${escapeHtml(
          message,
        )}
      </p>

      ${
        actionLabel
          ? `
            <button
              type="button"
              class="btn"
              id="statusAction"
            >
              ${escapeHtml(
                actionLabel,
              )}
            </button>
          `
          : ""
      }
    `;

    if (
      actionLabel &&
      actionFunction
    ) {
      const button =
        $(
          "statusAction",
        );

      button?.addEventListener(
        "click",
        actionFunction,
      );
    }
  }

  function hideStatus() {
    el.status.hidden =
      true;

    el.status.innerHTML =
      "";
  }

  /* =========================================================
     ACTIVE FILTERS
  ========================================================= */

  function hasActiveFilters() {
    return Boolean(
      state.q ||
        state.category ||
        state.min !==
          "" ||
        state.max !==
          "" ||
        state.stock,
    );
  }

  function renderChips() {
    const chips = [];

    if (state.q) {
      chips.push({
        label:
          `Search: ${state.q}`,

        clear: () => {
          state.q = "";
        },
      });
    }

    if (
      state.category
    ) {
      chips.push({
        label:
          state.category,

        clear: () => {
          state.category =
            "";
        },
      });
    }

    if (
      state.min !== ""
    ) {
      chips.push({
        label:
          `Min ${formatPrice(
            state.min,
          )}`,

        clear: () => {
          state.min = "";
        },
      });
    }

    if (
      state.max !== ""
    ) {
      chips.push({
        label:
          `Max ${formatPrice(
            state.max,
          )}`,

        clear: () => {
          state.max = "";
        },
      });
    }

    if (state.stock) {
      chips.push({
        label:
          "In stock only",

        clear: () => {
          state.stock =
            false;
        },
      });
    }

    el.chips.innerHTML =
      "";

    chips.forEach(
      (chip) => {
        const button =
          document.createElement(
            "button",
          );

        button.type =
          "button";

        button.className =
          "chip";

        button.textContent =
          chip.label;

        button.setAttribute(
          "aria-label",
          `Remove filter: ${chip.label}`,
        );

        button.addEventListener(
          "click",
          () => {
            chip.clear();

            state.page =
              1;

            syncControlsFromState();

            loadProducts();
          },
        );

        el.chips.appendChild(
          button,
        );
      },
    );
  }

  /* =========================================================
     PAGINATION PAGE NUMBERS
  ========================================================= */

  function pageList(
    current,
    total,
  ) {
    if (total <= 7) {
      return Array.from(
        {
          length:
            total,
        },
        (_, index) =>
          index + 1,
      );
    }

    const pages =
      new Set([
        1,
        total,
        current,
        current - 1,
        current + 1,
      ]);

    if (
      current <= 3
    ) {
      [2, 3, 4].forEach(
        (page) =>
          pages.add(
            page,
          ),
      );
    }

    if (
      current >=
      total - 2
    ) {
      [
        total - 1,
        total - 2,
        total - 3,
      ].forEach(
        (page) =>
          pages.add(
            page,
          ),
      );
    }

    const sorted =
      [...pages]
        .filter(
          (page) =>
            page >= 1 &&
            page <= total,
        )
        .sort(
          (a, b) =>
            a - b,
        );

    const result = [];

    sorted.forEach(
      (
        page,
        index,
      ) => {
        if (
          index &&
          page -
            sorted[
              index - 1
            ] >
            1
        ) {
          result.push(
            "gap",
          );
        }

        result.push(
          page,
        );
      },
    );

    return result;
  }

  /* =========================================================
     CHANGE PAGE
  ========================================================= */

  async function goToPage(
    page,
  ) {
    if (
      page < 1 ||
      page >
        paginationData.totalPages
    ) {
      return;
    }

    state.page =
      page;

    await loadProducts();

    window.scrollTo({
      top: 0,

      behavior:
        window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches
          ? "auto"
          : "smooth",
    });
  }

  /* =========================================================
     RENDER PAGINATION
  ========================================================= */

  function renderPagination() {
    const currentPage =
      paginationData.page;

    const totalPages =
      paginationData.totalPages;

    el.pagination.innerHTML =
      "";

    if (
      totalPages <= 1
    ) {
      return;
    }

    function createButton(
      label,
      page,
      disabled = false,
      ariaLabel = "",
    ) {
      const button =
        document.createElement(
          "button",
        );

      button.type =
        "button";

      button.className =
        "page-btn";

      button.textContent =
        label;

      button.disabled =
        disabled;

      if (
        ariaLabel
      ) {
        button.setAttribute(
          "aria-label",
          ariaLabel,
        );
      }

      button.addEventListener(
        "click",
        () =>
          goToPage(
            page,
          ),
      );

      return button;
    }

    /* Previous */

    el.pagination.appendChild(
      createButton(
        "Previous",
        currentPage - 1,
        currentPage <= 1,
        "Previous page",
      ),
    );

    /* Page numbers */

    pageList(
      currentPage,
      totalPages,
    ).forEach(
      (page) => {
        if (
          page ===
          "gap"
        ) {
          const gap =
            document.createElement(
              "span",
            );

          gap.className =
            "page-gap";

          gap.setAttribute(
            "aria-hidden",
            "true",
          );

          gap.textContent =
            "…";

          el.pagination.appendChild(
            gap,
          );

          return;
        }

        const button =
          createButton(
            String(page),
            page,
            false,
            `Page ${page}`,
          );

        if (
          page ===
          currentPage
        ) {
          button.classList.add(
            "active",
          );

          button.setAttribute(
            "aria-current",
            "page",
          );
        }

        el.pagination.appendChild(
          button,
        );
      },
    );

    /* Next */

    el.pagination.appendChild(
      createButton(
        "Next",
        currentPage + 1,
        currentPage >=
          totalPages,
        "Next page",
      ),
    );
  }

  /* =========================================================
     RENDER PRODUCTS
  ========================================================= */

  function update() {
    renderChips();

    writeStateToUrl();

    el.grid.setAttribute(
      "aria-busy",
      "false",
    );

    if (
      !allProducts.length
    ) {
      el.grid.innerHTML =
        "";

      /*
       * If stock is being
       * filtered locally,
       * this page might have
       * no stock even though
       * another page does.
       */

      if (
        state.stock &&
        paginationData.totalItems >
          0
      ) {
        renderPagination();

        el.summary.textContent =
          `No in-stock products on page ${paginationData.page} of ${paginationData.totalPages}`;

        showStatus(
          "No in-stock products on this page",

          "Try another page or turn off the In stock only filter.",

          "Show all stock statuses",

          () => {
            state.stock =
              false;

            state.page =
              1;

            syncControlsFromState();

            loadProducts();
          },
        );

        return;
      }

      el.pagination.innerHTML =
        "";

      el.summary.textContent =
        "0 products found";

      if (
        hasActiveFilters()
      ) {
        showStatus(
          "No products match",

          "Try a different search term or remove some filters.",

          "Clear all filters",

          resetAll,
        );
      } else {
        showStatus(
          "No products yet",

          "Products added to the system will appear here.",
        );
      }

      return;
    }

    hideStatus();

    el.grid.innerHTML =
      allProducts
        .map(
          cardHtml,
        )
        .join("");

    renderPagination();

    if (state.stock) {
      el.summary.textContent =
        `${allProducts.length} in-stock product${
          allProducts.length ===
          1
            ? ""
            : "s"
        } shown on page ${paginationData.page} of ${paginationData.totalPages}`;

      return;
    }

    const start =
      (
        paginationData.page -
        1
      ) *
        paginationData.limit +
      1;

    const end =
      Math.min(
        start +
          allProducts.length -
          1,

        paginationData.totalItems,
      );

    el.summary.textContent =
      `Showing ${start}-${end} of ${paginationData.totalItems} products`;
  }

  /* =========================================================
     RESET FILTERS
  ========================================================= */

  function resetAll() {
    state = {
      ...DEFAULTS,

      /*
       * Keep user's currently
       * selected page size.
       */
      limit:
        state.limit,
    };

    syncControlsFromState();

    loadProducts();
  }

  /* =========================================================
     EVENT LISTENERS
  ========================================================= */

  function bindEvents() {
    /* Search */

    el.search?.addEventListener(
      "input",

      debounce(
        () => {
          state.q =
            el.search.value;

          state.page =
            1;

          loadProducts();
        },

        300,
      ),
    );

    /* Sorting */

    el.sort?.addEventListener(
      "change",
      () => {
        state.sort =
          el.sort.value;

        state.page =
          1;

        loadProducts();
      },
    );

    /* Items per page */

    el.pageSize?.addEventListener(
      "change",
      () => {
        const nextLimit =
          Number(
            el.pageSize.value,
          );

        state.limit =
          Number.isInteger(
            nextLimit,
          ) &&
          nextLimit > 0
            ? nextLimit
            : DEFAULTS.limit;

        state.page =
          1;

        loadProducts();
      },
    );

    /* Category */

    el.categorySelect?.addEventListener(
      "change",
      () => {
        state.category =
          el.categorySelect.value;

        state.page =
          1;

        loadProducts();
      },
    );

    /* Price filters */

    const handlePriceChange =
      debounce(
        () => {
          state.min =
            el.minPrice.value.trim();

          state.max =
            el.maxPrice.value.trim();

          state.page =
            1;

          loadProducts();
        },

        400,
      );

    el.minPrice?.addEventListener(
      "input",
      handlePriceChange,
    );

    el.maxPrice?.addEventListener(
      "input",
      handlePriceChange,
    );

    /* Stock */

    el.inStock?.addEventListener(
      "change",
      () => {
        state.stock =
          el.inStock.checked;

        state.page =
          1;

        loadProducts();
      },
    );

    /* Clear filters */

    el.clear?.addEventListener(
      "click",
      resetAll,
    );

    /* Mobile filters */

    el.toggle?.addEventListener(
      "click",
      () => {
        if (
          !el.panel
        ) {
          return;
        }

        const isOpen =
          el.panel.classList.toggle(
            "open",
          );

        el.toggle.setAttribute(
          "aria-expanded",
          String(
            isOpen,
          ),
        );
      },
    );
  }

  /* =========================================================
     PRODUCT RESPONSE PARSER
  ========================================================= */

  function getProductList(
    response,
  ) {
    const products =
      response?.data
        ?.products ??
      response?.products ??
      response?.data ??
      response;

    return Array.isArray(
      products,
    )
      ? products
      : [];
  }

  /* =========================================================
     CATEGORY RESPONSE PARSER
  ========================================================= */

  function getCategoryList(
    response,
  ) {
    const categories =
      response?.data
        ?.categories ??
      response?.categories ??
      response?.data ??
      response;

    if (
      !Array.isArray(
        categories,
      )
    ) {
      return [];
    }

    const unique =
      new Map();

    categories.forEach(
      (category) => {
        const value =
          String(
            category ??
              "",
          ).trim();

        if (!value) {
          return;
        }

        const key =
          value.toLowerCase();

        if (
          !unique.has(
            key,
          )
        ) {
          unique.set(
            key,
            value,
          );
        }
      },
    );

    return [
      ...unique.values(),
    ].sort(
      (a, b) =>
        a.localeCompare(
          b,
          undefined,
          {
            sensitivity:
              "base",
          },
        ),
    );
  }

  /* =========================================================
     LOAD CATEGORIES
  ========================================================= */

  async function loadCategories() {
    try {
      const response =
        await api.products.categories();

      const categories =
        getCategoryList(
          response,
        );

      el.categorySelect.innerHTML =
        `
          <option value="">
            All categories
          </option>
        `;

      categories.forEach(
        (category) => {
          const option =
            document.createElement(
              "option",
            );

          option.value =
            category;

          option.textContent =
            category;

          el.categorySelect.appendChild(
            option,
          );
        },
      );

      /*
       * Preserve category
       * from URL even if
       * backend doesn't
       * return it anymore.
       */

      if (
        state.category &&
        !categories.some(
          (category) =>
            category.toLowerCase() ===
            state.category.toLowerCase(),
        )
      ) {
        const option =
          document.createElement(
            "option",
          );

        option.value =
          state.category;

        option.textContent =
          state.category;

        el.categorySelect.appendChild(
          option,
        );
      }

      el.categorySelect.value =
        state.category;
    } catch (error) {
      console.error(
        "Unable to load product categories:",
        error,
      );

      /*
       * Product listing
       * should still work
       * even if category
       * loading fails.
       */

      el.categorySelect.innerHTML =
        `
          <option value="">
            All categories
          </option>
        `;

      if (
        state.category
      ) {
        const option =
          document.createElement(
            "option",
          );

        option.value =
          state.category;

        option.textContent =
          state.category;

        el.categorySelect.appendChild(
          option,
        );

        el.categorySelect.value =
          state.category;
      }
    }
  }

  /* =========================================================
     LOAD PRODUCTS
  ========================================================= */

  async function loadProducts() {
    const thisRequest =
      ++requestId;

    hideStatus();

    el.pagination.innerHTML =
      "";

    el.summary.textContent =
      "Loading products…";

    renderSkeletons(
      Math.min(
        state.limit,
        12,
      ),
    );

    try {
      /*
       * buildFilters()
       * produces:
       *
       * search
       * category
       * minPrice
       * maxPrice
       * sortBy
       * sortOrder
       * page
       * limit
       */

      const response =
        await api.products.list(
          buildFilters(),
        );

      /*
       * Ignore stale API
       * responses.
       */

      if (
        thisRequest !==
        requestId
      ) {
        return;
      }

      const rawProducts =
        getProductList(
          response,
        );

      paginationData =
        readPagination(
          response,
          rawProducts.length,
        );

      /*
       * Example:
       *
       * User is on page 4,
       * applies a filter,
       * filtered results only
       * have 2 pages.
       *
       * Move user back to
       * the last valid page.
       */

      if (
        paginationData.totalItems >
          0 &&
        paginationData.totalPages >
          0 &&
        state.page >
          paginationData.totalPages
      ) {
        state.page =
          paginationData.totalPages;

        await loadProducts();

        return;
      }

      allProducts =
        applyFilters(
          rawProducts.map(
            normalize,
          ),
        );

      update();
    } catch (error) {
      /*
       * Ignore stale failed
       * requests too.
       */

      if (
        thisRequest !==
        requestId
      ) {
        return;
      }

      allProducts = [];

      el.grid.innerHTML =
        "";

      el.grid.setAttribute(
        "aria-busy",
        "false",
      );

      el.pagination.innerHTML =
        "";

      el.summary.textContent =
        "Unable to load products";

      showStatus(
        "Unable to load products",

        error?.message ||
          "Please check your connection and try again.",

        "Try again",

        loadProducts,
      );
    }
  }

  /* =========================================================
     INITIALIZATION
  ========================================================= */

  async function init() {
    /*
     * Make sure required
     * elements exist.
     */

    if (
      !el.grid ||
      !el.pagination ||
      !el.summary
    ) {
      console.error(
        "Products page initialization failed: required HTML elements are missing.",
      );

      return;
    }

    syncControlsFromState();

    bindEvents();

    /*
     * Load categories and
     * products independently.
     *
     * Category failure should
     * not stop product loading.
     */

    await Promise.allSettled([
      loadCategories(),
      loadProducts(),
    ]);
  }

  init();
})();