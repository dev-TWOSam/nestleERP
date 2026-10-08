# nestleERP Backend

This is the backend foundation for the nestleERP monorepo.

## Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- JavaScript (CommonJS)

## Requirements

- Node.js 20 or newer

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

Required values include:

```env
PORT=4001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_jwt_secret
SUPER_ADMIN_BOOTSTRAP_SECRET=your_one_time_bootstrap_secret
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_email_password
FRONTEND_URL=http://localhost:3000
```

Set a long random bootstrap secret before calling `POST /api/users/bootstrap/super-admin` with the `x-bootstrap-secret` header. Remove the secret from the environment after the first Super Admin is created; the database also permanently records that bootstrap has been used.

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
