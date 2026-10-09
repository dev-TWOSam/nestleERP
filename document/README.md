# API Documentation

This folder contains backend API documentation files.

- Postman collection: `postman/nestleERP.postman_collection.json`
- Swagger/OpenAPI spec: `swagger/swagger.yaml`

The Postman collection defaults to the production backend at
`https://nestleerp.onrender.com`. To use a local backend, change its `baseUrl`
collection variable to `http://localhost:4001`. Set `bootstrapToken` from
`SUPER_ADMIN_BOOTSTRAP_TOKEN` in the ignored `backend/.env` before using the
one-time bootstrap request. Never commit that token. Login and OTP verification
save the JWT and password-reset authorization into collection variables for
subsequent requests.

The OpenAPI 3.0 specification includes both production and local backend
servers and can be imported into Swagger UI or another OpenAPI-compatible
viewer.
