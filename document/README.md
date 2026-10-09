# Backend API documentation

## Files

- Postman collection: [`postman/nestleERP.postman_collection.json`](./postman/nestleERP.postman_collection.json)
- OpenAPI 3.0 specification: [`swagger/swagger.yaml`](./swagger/swagger.yaml)

There is no Swagger UI configured in the backend. Import the OpenAPI file into
Swagger UI or another OpenAPI-compatible viewer to browse the specification.

## Base URLs

- Production backend: `https://nestleerp.onrender.com`
- Local backend: `http://localhost:4001` when `PORT=4001`

The server listens on the `PORT` environment variable; it has no application
default. `backend/.env.example` sets `PORT=4001`, so use the corresponding local
URL when using that configuration. The Swagger document lists both production
and local servers.

Staff-account emails use `FRONTEND_URL` for their login link. In the deployed
backend environment, set it to the frontend deployment:
`https://nestleerp.vercel.app`.

## Postman usage

Import the Postman collection from the path above. Its `baseUrl` variable
defaults to production; change it to your local backend URL for local work.

The collection includes health, registration, authentication, password
recovery, user administration, and product requests. Protected requests use
bearer authentication and read the JWT from the `authToken` collection
variable. Run Login to save its JWT there. The password-reset OTP verification
request saves its short-lived `resetToken`, which the reset request then uses.

The one-time Super Admin bootstrap request requires the server-side
`SUPER_ADMIN_BOOTSTRAP_TOKEN` in `x-bootstrap-token`. Supply that token only in
your private/local Postman variable store; do not save it in or commit the
collection. The bootstrap endpoint only works before a Super Admin exists.

Product create/update requests use `multipart/form-data`. Product creation
requires a single image file in the `image` field (JPG, JPEG, or PNG); select a
file in Postman before sending the example request. Product prices must be at
least `1`; inventory quantity may be `0`.

## Health Endpoint

### Health check

`GET /health`

```sh
curl https://nestleerp.onrender.com/health
```

Example success response (`200 OK`):

```json
{
  "status": "OK",
  "message": "nestleERP backend is running",
  "requestedPath": "/health",
  "timestamp": "2026-10-09T18:30:00.000Z"
}
```

## Product Endpoints

Product reads are public. Product creation, update, and deletion require a
bearer JWT for an `inventory-manager` or `super-admin`.

### Get a product by ID

`GET /api/products/{id}`

```sh
curl https://nestleerp.onrender.com/api/products/<product-id>
```

Example success response (`200 OK`):

```json
{
  "product": {
    "_id": "<product-id>",
    "name": "Smart Watch",
    "description": "Fitness tracking watch",
    "category": "Electronics",
    "price": 25000,
    "size": "42mm",
    "quantity": 7,
    "status": "In Stock",
    "color": "Black",
    "image": "https://example.com/smart-watch.png",
    "createdAt": "2026-10-09T18:00:00.000Z",
    "updatedAt": "2026-10-09T18:00:00.000Z"
  }
}
```

The IDs, image URL, and timestamps above are illustrative; a missing product
returns `404`.

### Other product requests

List products:

```sh
curl "https://nestleerp.onrender.com/api/products"
```

Search/filter products with optional `id`, `name` (or `q`), `category`, `size`,
`price`, `minPrice`, and `maxPrice` query parameters:

```sh
curl "https://nestleerp.onrender.com/api/products/search?name=watch&category=Electronics&minPrice=1&maxPrice=50000"
```

List products by category:

```sh
curl "https://nestleerp.onrender.com/api/products/categories/Electronics"
```

Create a product with `multipart/form-data`. Replace the placeholders with
product values and select a JPG, JPEG, or PNG file for `image`:

```sh
JWT="<paste-token-from-login-response>"
curl -X POST https://nestleerp.onrender.com/api/products \
  -H "Authorization: Bearer ${JWT}" \
  -F "name=Smart Watch" \
  -F "description=Fitness tracking watch" \
  -F "category=Electronics" \
  -F "price=25000" \
  -F "size=42mm" \
  -F "quantity=7" \
  -F "color=Black" \
  -F "image=@<path-to-image.png>"
```

Update and delete use `PUT /api/products/{id}` and `DELETE /api/products/{id}`.
Updates also use multipart form data; omitted fields and an omitted image retain
their existing values.

## User Endpoints

### Register a regular user

`POST /api/users`

```sh
curl -X POST https://nestleerp.onrender.com/api/users \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Ada","lastName":"Lovelace","gender":"Female","email":"ada@example.com","password":"<strong-password>","location":"Lagos","phoneCountryCode":"+234","phone":"8012345678","address":"10 Main Road"}'
```

The success response (`201 Created`) contains a `message` and a `user` object;
the password is omitted.

### Sign in

`POST /api/users/login`

```sh
curl -X POST https://nestleerp.onrender.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<your-email>","password":"<your-password>"}'
```

A normal sign-in returns a JWT in the `token` field. Staff signing in with a
temporary password must change that password first; the response indicates
`passwordChangeRequired` and does not contain a token.

Other user routes include one-time Super Admin bootstrap,
`POST /api/users/password/change`, `/password/forgot`, `/password/verify-otp`,
and `/password/reset`, plus Super Admin staff and user management routes. Their
complete paths, fields, and responses are in the Postman collection and
OpenAPI specification.

## Authentication and authorization

Login issues a bearer JWT that expires after one hour. Send it on protected
requests as:

```http
Authorization: Bearer <jwt>
```

User listing, lookup, update, deletion, and staff creation require the
`super-admin` role. Product creation, update, and deletion allow
`inventory-manager` and `super-admin`. Product reads, user registration,
login, password change/recovery, and bootstrap use their route-specific
credentials rather than bearer authorization. Bootstrap requires
`x-bootstrap-token` matching the server's `SUPER_ADMIN_BOOTSTRAP_TOKEN` and is
only available before a Super Admin exists. Keep that secret outside the
collection and source control.

## API Validation

- User registration requires first and last name, gender, email, password,
  location, phone country code, phone number, and address. Gender is `Male` or
  `Female`; location must be a Nigerian state or `FCT`; phone values are
  combined and checked as an international number.
- Passwords must be 12–30 characters and contain uppercase and lowercase
  letters, a digit, and one of `@ # $ ! % * ? & _`.
- Product creation requires name, description, category, price, size, quantity,
  color, and an image. Price must be at least `1`; quantity may be `0`. Product
  status is `In Stock`, `Inactive`, or `Out of Stock` and defaults to
  `In Stock`.
- Product search validates IDs and numeric price filters, rejects negative
  prices, and rejects a minimum price greater than the maximum.
- Invalid requests generally return JSON with a `message`; status codes and
  endpoint-specific response shapes are listed in the OpenAPI specification.
