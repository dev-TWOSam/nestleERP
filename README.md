# nestleERP

### Group 25 TS Academy Capstone Project

A mini eCommerce platform focused on product management, product discovery, and role-based inventory administration.

---

## Table of Contents

- [Project Overview](#project-overview)
- [MVP Direction](#mvp-direction)
- [Project Objectives](#project-objectives)
- [User Roles and Permissions](#user-roles-and-permissions)
- [Core MVP Functionalities](#core-mvp-functionalities)
- [Product Management](#product-management)
- [Product Discovery](#product-discovery)
- [Search API Requirements](#search-api-requirements)
- [Monorepo Architecture](#monorepo-architecture)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Application Development](#application-development)
- [API Scope](#api-scope)
- [Role-Based Access Control](#role-based-access-control)
- [Development Workflow](#development-workflow)
- [Branching Strategy](#branching-strategy)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Team Structure](#team-structure)
- [Project Scope and Priorities](#project-scope-and-priorities)
- [Future Enhancements](#future-enhancements)
- [Contribution Guidelines](#contribution-guidelines)
- [Project Status](#project-status)

---

## Project Overview

**nestleERP** is the Group 25 TS Academy Capstone project.

## Project structure

- backend/
- frontend/

The backend and frontend are maintained as separate applications within the monorepo.

## Run the backend from the root

```powershell
npm run dev
```

### Start the Backend Without Nodemon

From the backend directory:

```bash
npm run start
```

Or, if configured at the root:

```bash
npm run start
```

Refer to the relevant `package.json` scripts if the command behavior differs.

---

## Environment Configuration

The backend uses environment variables for configuration.

Create a local environment file from the provided example:

```bash
cp backend/.env.example backend/.env
```

On Windows PowerShell, you can use:

```powershell
Copy-Item backend/.env.example backend/.env
```

Update the environment variables with your local configuration.

### Example Environment Variables

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

The variables above are examples. Use the actual names required by the backend implementation.

### Environment Security

- Do not commit `.env` files containing secrets.
- Do not share database credentials publicly.
- Keep sensitive configuration in local environment files or approved secret-management systems.
- Ensure `.gitignore` excludes sensitive environment files.

---

## Application Development

### Backend Development

Backend developers should work within the `backend/` application.

Typical responsibilities include:

- Designing and implementing API endpoints.
- Creating product models.
- Implementing controllers and services.
- Implementing product search and filtering.
- Writing validations.
- Handling database operations.
- Writing tests.
- Documenting API behavior.

## Backend project

The backend is a separate Node.js + Express.js application located in `backend/`.

## Notes

- The root repository is the only Git repository for the monorepo.
- The backend is the active application foundation for this project.
- Frontend setup will be added later as a separate application within the same repository.
