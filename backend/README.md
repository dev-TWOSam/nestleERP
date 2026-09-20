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
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

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
