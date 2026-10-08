# nestleERP Backend

This is the backend foundation for the nestleERP monorepo.

## Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JavaScript (CommonJS)

## Requirements

- Node.js 18 or newer

## Install dependencies

From the project root:

```powershell
npm install --prefix backend
```

Or from inside the backend folder:

```powershell
cd backend
npm install
```

## Run the backend

From the project root:

```powershell
npm run dev
```

From the backend folder:

```powershell
cd backend
npm run dev
```

## Start without nodemon

```powershell
npm run start
```

## Run tests

```powershell
npm test
```

## Environment variables

Copy the example file and update the values for your local environment:

```powershell
Copy-Item .env.example .env
```

Example values:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_jwt_secret
PASSWORD_RESET_SECRET=optional_long_random_secret_for_reset_otp_hashing
SUPER_ADMIN_BOOTSTRAP_TOKEN=required_long_random_one_time_bootstrap_secret
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_email_password
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

The bootstrap endpoint is disabled until `SUPER_ADMIN_BOOTSTRAP_TOKEN` is set.
Send it in the `x-bootstrap-token` header when calling
`POST /api/users/bootstrap/super-admin`. The database permits this bootstrap
only while no Super Admin exists; a database claim prevents concurrent reuse.

Staff credentials expire after 24 hours. A successful login with a temporary
password returns `passwordChangeRequired: true` without a session token; use
`POST /api/users/password/change` with the email, current password, new password,
and confirmation before signing in normally.

Password recovery endpoints are `POST /api/users/password/forgot`,
`POST /api/users/password/verify-otp`, and `POST /api/users/password/reset`.
OTP and reset authorization expire after 10 minutes. Set the SMTP variables to
deliver account and password-reset email; automated tests mock email delivery.

## Project structure

- src/config/
- src/controllers/
- src/middleware/
- src/models/
- src/routes/
- src/services/
- src/utils/
- src/validations/
- tests/

This project is intentionally set up as a clean foundation for future backend development.
