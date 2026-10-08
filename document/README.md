# nestleERP API Documentation

This folder contains both a Postman collection and a Swagger/OpenAPI specification for the backend.

## Files

- `postman/nestleERP.postman_collection.json` — Postman collection for the backend API
- `swagger/swagger.yaml` — OpenAPI 3.0 specification

## Import into Postman

1. Open Postman.
2. Click Import.
3. Select the file `postman/nestleERP.postman_collection.json`.
4. Update the collection variable `baseUrl` to your local backend URL, for example:
   - `http://localhost:5000`
5. If a route requires a token, set the token in the Postman environment or in the request header:
   - `Authorization: Bearer <token>`

## View Swagger UI

You can open the Swagger spec in any of these ways:

1. Use Swagger Editor: https://editor.swagger.io/
2. Import `swagger/swagger.yaml` into Swagger UI.
3. Or serve it via a local Swagger UI setup if you want a browser-based API documentation page.

## Base URL

By default, the app is configured to run under:

- `http://localhost:5000`

If your backend port is different, update the collection and Swagger server URL accordingly.

## Authenticated Routes

Protected endpoints require a valid JWT token. After login, copy the token from the login response and use it in the `Authorization` header as:

```http
Authorization: Bearer <your_jwt_token>
```

## Notes

- The user routes include authentication and role-based access control for admin actions.
- Product routes require login and authorization for create, update, and delete operations.
- The `POST /api/products` and `PUT /api/products/:id` routes accept a file upload field named `image`.
