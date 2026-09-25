# Shared Logo Asset

The official nestleERP frontend logo is currently hosted on Cloudinary:

https://res.cloudinary.com/xbezzyxi/image/upload/v1790303103/WhatsApp_Image_2026-09-24_at_6.19.18_PM.jpg

The shared URL is exposed through `APP_CONFIG.assets.logoUrl` in `frontend/js/config.js`.
Page-specific code should reuse that shared configuration instead of duplicating the URL.

The shared CSS class for rendering the logo is `.site-logo` in `frontend/css/main.css`.
