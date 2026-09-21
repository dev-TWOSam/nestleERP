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

The project is a mini eCommerce platform designed to provide essential product management and product discovery functionalities within a single monorepository.

The platform will allow authorized staff to manage product records, while users can discover available products through a structured, searchable, filterable, sortable, and paginated interface.

The project is being developed by a team of 20 developers, comprising:

- 10 Backend Developers
- 10 Frontend/Software Developers
- 2 Backend Leads
- 2 Frontend/Software Leads

The backend and frontend applications are maintained separately within the same monorepo.

### Project Vision

To build a functional and maintainable mini eCommerce platform that demonstrates practical application of full-stack development principles, including:

- RESTful API development
- Product and inventory management
- Role-based access control
- Search, filtering, sorting, and pagination
- Frontend-backend integration
- Collaborative software development
- Code review and version control

The MVP prioritizes the delivery of essential product management and product discovery features within the available project timeline.

---

## MVP Direction

### Minimum Viable Product (MVP)

For this MVP, we will build a mini eCommerce platform focused on:

1. Product management
2. Product discovery
3. Role-based staff administration
4. Search API implementation

The platform will allow authorized staff to create, upload, update, and delete products, while users will be able to view, search, filter, sort, and navigate available products through a paginated interface.

The MVP is designed to establish a functional foundation for future eCommerce capabilities without introducing unnecessary complexity that could affect the delivery of core requirements.

---

## Project Objectives

The primary objectives of the nestleERP MVP are to:

- Develop a functional product management system.
- Enable authorized staff to manage product records.
- Provide users with an intuitive product discovery experience.
- Implement an effective product search API.
- Support product filtering, sorting, and pagination.
- Introduce role-based permissions for administrative operations.
- Maintain a clear separation between frontend and backend applications.
- Encourage collaborative development using Git and GitHub.
- Establish a maintainable and scalable foundation for future enhancements.

---

## User Roles and Permissions

The platform will support three primary role types:

1. User
2. Super Admin
3. Inventory Manager

Each role will have access to specific features based on its responsibilities and permissions.

### 1. User

Users will be able to discover and browse available products through the platform.

#### MVP Permissions

- Access the website.
- View available products.
- Search for products by name or ID.
- Filter products.
- Sort products.
- Navigate products through pagination.

#### User Restrictions

Users will not have permission to:

- Create products.
- Update products.
- Delete products.
- Manage staff accounts.
- Manage administrative roles.

User access should focus on product discovery and browsing.

---

### 2. Super Admin

The Super Admin will have overall administrative control over the platform.

The Super Admin is responsible for managing staff, assigning administrative roles, and overseeing product management operations.

#### MVP Permissions

**Staff Management**

- Create or invite staff.
- Create and manage Super Admin and Inventory Manager roles.
- Manage staff accounts.
- Search users by name, email, location, and other relevant attributes.
- View user activity and logs, where implemented within the MVP scope.

**Product Management**

- Create or upload products.
- Update products.
- Delete products.
- Search products by ID or name.
- Filter products.
- Sort products, including by price.
- View product records.

#### Administrative Responsibilities

- Manage authorized staff access.
- Maintain appropriate role assignments.
- Oversee product management operations.
- Support platform administration and monitoring.

Administrative permissions must be implemented with appropriate access controls to prevent unauthorized operations.

---

### 3. Inventory Manager

Inventory Managers will be responsible for managing product records and inventory-related product information.

#### MVP Permissions

**Product Management**

- Create or upload products.
- Update products.
- Delete products.
- Search products by ID or name.
- Filter products.
- Sort products, including by price.
- View product records.

#### Inventory Manager Restrictions

Inventory Managers should not have unrestricted access to Super Admin functions.

Super Admin-specific operations, such as managing administrative roles and staff permissions, should be restricted to users with the appropriate authorization.

---

## Core MVP Functionalities

The following features form the core scope of the MVP.

### 1. Product Creation and Upload

Authorized staff should be able to create and upload product records.

Product records may include:

- Product ID
- Product name
- Product description
- Product price
- Product category
- Product image or image URL
- Product availability or stock information
- Creation date
- Last updated date

The final product schema should be agreed upon by the backend and frontend teams before implementation.

**Acceptance Criteria**

- Authorized staff can submit product information.
- Required fields are validated.
- Valid product records are saved successfully.
- Unauthorized users cannot create products.
- Appropriate success and error responses are returned.

---

### 2. Product Update

Authorized staff should be able to update existing product records.

**Acceptance Criteria**

- Authorized users can locate a product.
- Product information can be updated.
- Invalid input is rejected with an appropriate response.
- The updated record is persisted.
- Users receive appropriate feedback after an update.

---

### 3. Product Deletion

Authorized staff should be able to delete product records according to the agreed product management rules.

**Acceptance Criteria**

- Only authorized roles can delete products.
- The target product is validated.
- The deletion operation returns an appropriate response.
- Deleted products no longer appear in the relevant product listings.
- The team agrees on whether deletion is permanent or uses a soft-delete approach.

> The deletion strategy should be finalized before implementation. Soft deletion may be considered if product history or auditability is required.

---

### 4. View Products

Users and authorized staff should be able to view available product records according to their permissions.

The product listing should provide a structured interface for viewing product information.

Expected capabilities include:

- Product listing.
- Product details.
- Product availability information, where included.
- Pagination.
- Search and filtering.
- Sorting.

---

### 5. Product Search

The platform must support searching for products by:

- Product name.
- Product ID.

The search functionality should be implemented through a backend API and integrated with the frontend application.

#### Search Requirements

- Support searching by product name.
- Support searching by product ID.
- Return relevant matching products.
- Handle empty or missing search terms appropriately.
- Support pagination alongside search.
- Return consistent API responses.
- Handle cases where no matching products are found.

Search behavior, matching rules, and case sensitivity should be agreed upon by the backend team.

---

### 6. Product Filtering

Users and authorized staff should be able to filter products using agreed product attributes.

Potential filter options include:

- Product category.
- Price range.
- Availability.
- Other relevant product attributes.

The final filter options will depend on the agreed product schema and MVP timeline.

#### Acceptance Criteria

- Users can apply supported filters.
- Multiple filters behave consistently where supported.
- Filtering works alongside search and pagination.
- Invalid filter values are handled appropriately.
- Results reflect the selected filter criteria.

---

### 7. Product Sorting

The platform should allow users to sort product results.

The MVP must support sorting by price.

Additional sorting options may include:

- Price: Low to High.
- Price: High to Low.
- Product name: A–Z.
- Product name: Z–A.
- Date added, if included in the final requirements.

#### Acceptance Criteria

- Users can select a supported sort option.
- Results are returned in the expected order.
- Sorting works with search, filters, and pagination.
- Invalid sort parameters are handled appropriately.

---

### 8. Product Pagination

The product listing must support pagination to ensure that product results can be navigated in manageable pages.

#### Expected Pagination Features

- Page number.
- Page size or limit.
- Total result count.
- Total page count, where supported.
- Next page navigation.
- Previous page navigation.

#### Acceptance Criteria

- Product results are returned in pages.
- Users can navigate between available pages.
- Pagination works alongside search, filtering, and sorting.
- Invalid page values are handled appropriately.
- API responses provide sufficient metadata for the frontend.

---

## Product Management

### Product Management Access

| Feature | User | Inventory Manager | Super Admin |
|---|---|---|---|
| View products | Yes | Yes | Yes |
| Search products | Yes | Yes | Yes |
| Filter products | Yes | Yes | Yes |
| Sort products | Yes | Yes | Yes |
| Pagination | Yes | Yes | Yes |
| Create products | No | Yes | Yes |
| Update products | No | Yes | Yes |
| Delete products | No | Yes | Yes |
| Manage staff | No | No | Yes |
| Manage administrative roles | No | No | Yes |
| View activity/logs | No | As authorized | Yes |

**Note:** This table represents the proposed MVP permission model. The final implementation must enforce permissions on the backend, not only in the frontend interface.

---

## Product Discovery

Product discovery is a core component of the MVP.

The product discovery experience should allow users to find products efficiently through a combination of:

- Search.
- Filtering.
- Sorting.
- Pagination.

### Product Discovery Flow

1. User opens the product listing page.
2. The frontend requests products from the backend.
3. The user enters a search term, if needed.
4. The user applies one or more supported filters.
5. The user selects a sorting option.
6. The backend processes the query parameters.
7. The frontend displays the resulting products.
8. The user navigates through paginated results.

Search, filtering, sorting, and pagination should be designed to work together without unnecessary duplication of API logic.

---

## Search API Requirements

The Search API is a core requirement of this MVP.

The backend team should implement a consistent API that supports product discovery through query parameters.

### Proposed Endpoint

```http
GET /api/products
```

### Proposed Query Parameters

| Parameter | Description | Example |
|---|---|---|
| `search` | Search by product name or ID | `search=phone` |
| `category` | Filter by category | `category=electronics` |
| `minPrice` | Minimum product price | `minPrice=1000` |
| `maxPrice` | Maximum product price | `maxPrice=50000` |
| `sortBy` | Field used for sorting | `sortBy=price` |
| `sortOrder` | Sorting direction | `sortOrder=asc` |
| `page` | Page number | `page=1` |
| `limit` | Number of results per page | `limit=10` |

The parameters above are proposed API conventions and should be finalized by the backend team before implementation.

### Example Request

```http
GET /api/products?search=phone&sortBy=price&sortOrder=asc&page=1&limit=10
```

### Proposed Response Structure

```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "products": [],
    "pagination": {
	"page": 1,
	"limit": 10,
	"totalItems": 0,
	"totalPages": 0
    }
  }
}
```

The response structure is a proposed example. The final API contract should be agreed upon and documented by the backend team.

### API Design Expectations

- Use appropriate HTTP methods.
- Validate incoming query parameters.
- Return consistent response structures.
- Use appropriate HTTP status codes.
- Handle errors gracefully.
- Avoid exposing sensitive information.
- Document endpoints and their expected behavior.
- Ensure frontend developers have access to the agreed API contract.

---

## Monorepo Architecture

The project follows a monorepo structure.

The backend and frontend are maintained as separate applications within the same Git repository.

### Monorepo Principles

- The root repository is the only Git repository for the project.
- The backend and frontend have separate application responsibilities.
- Each application should maintain its own dependencies and configuration.
- Shared project documentation and repository-level configuration belong at the root.
- Changes should be reviewed according to the relevant application and shared functionality.

The monorepo approach allows both teams to collaborate in one repository while maintaining separation between backend and frontend development.

---

## Project Structure

```text
nestleERP/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── validations/
│   │
│   ├── tests/
│   ├── .env.example
│   ├── .gitignore
│   ├── README.md
│   ├── app.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── [Frontend application files]
│   ├── .gitignore
│   ├── README.md
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
├── README.md
├── package.json
└── package-lock.json
```

### Backend Responsibilities

The backend application is responsible for:

- API development.
- Product management logic.
- Product search.
- Filtering and sorting.
- Pagination.
- Database integration.
- Request validation.
- Authentication and authorization, if included in the agreed MVP.
- Error handling.
- Backend testing.

### Frontend Responsibilities

The frontend application is responsible for:

- User interface development.
- Product listing and discovery.
- Search interface.
- Filtering and sorting controls.
- Pagination controls.
- Administrative product management interfaces.
- Integration with backend APIs.
- Client-side validation and user feedback.

The exact frontend structure will be established as frontend development progresses.

---

## Technology Stack

### Backend

The backend is a Node.js and Express.js application.

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | Backend web framework |
| MongoDB | Database |
| Mongoose | MongoDB object modeling, where used |
| JavaScript | Backend development language |

### Frontend

The frontend will be maintained as a separate application within the monorepo.

The final frontend framework, libraries, and tooling should be documented here once confirmed by the frontend/software leads.

### Development Tools

- Git.
- GitHub.
- Visual Studio Code or another suitable code editor.
- npm.
- API testing tools, as agreed by the team.

---

## Getting Started

### Prerequisites

Before running the project, ensure that you have the required development tools installed.

- Node.js 18 or newer (backend requirement currently documented).
- npm.
- Git.
- MongoDB, where required by the backend implementation.
- Access to the project repository.

Verify your Node.js and npm versions:

```bash
node -v
npm -v
```

---

## Clone the Repository

Clone the repository using Git:

```bash
git clone https://github.com/dev-TWOSam/nestleERP.git
```

Navigate into the project directory:

```bash
cd nestleERP
```

---

## Install Dependencies

### Root Dependencies

From the project root:

```bash
npm install
```

### Backend Dependencies

From the project root:

```bash
npm install --prefix backend
```

Alternatively, navigate to the backend directory:

```bash
cd backend
npm install
```

### Frontend Dependencies

Frontend installation instructions will be added when the frontend application setup is finalized.

---

## Running the Application

### Run the Backend from the Root

The root repository provides a command that delegates development execution to the backend application.

From the project root:

```bash
npm run dev
```

This command runs the backend development process according to the root `package.json` configuration.

### Run the Backend from the Backend Directory

Navigate to the backend folder:

```bash
cd backend
```

Start the backend development server:

```bash
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

### Frontend Development

Frontend developers should work within the `frontend/` application.

Typical responsibilities include:

- Building product discovery interfaces.
- Developing administrative product management pages.
- Connecting to backend APIs.
- Handling loading, error, and empty states.
- Implementing search, filtering, sorting, and pagination interfaces.
- Ensuring a consistent user experience.

### Cross-Team Collaboration

Frontend and backend developers should coordinate on API contracts before implementation.

For example:

- Product response structure.
- Product creation fields.
- Search parameters.
- Pagination metadata.
- Error response formats.
- Authentication and permission behavior.

API changes that affect the frontend should be communicated to the relevant frontend lead.

---

## Role-Based Access Control

The platform is expected to support role-based permissions for administrative operations.

### Access Control Principles

- Users should only access features permitted for their role.
- Backend authorization must be enforced independently of frontend visibility.
- Administrative endpoints must validate the requester's permissions.
- Role management must be restricted to authorized administrators.
- Unauthorized requests should return appropriate HTTP responses.

### Proposed Permission Levels

| Role | Access Level |
|---|---|
| User | Product discovery |
| Inventory Manager | Product management |
| Super Admin | Administrative and product management |

The exact authentication implementation and role-management workflow should be finalized before these features are developed.

---

## Development Workflow

The project uses a collaborative Git and GitHub workflow.

The root repository is the only Git repository for the monorepo.

All developers should work through branches and Pull Requests rather than making direct changes to protected integration branches.

### Development Workflow

```text
Task Assignment
	│
	▼
Create Feature Branch
	│
	▼
Develop and Test
	│
	▼
Create Pull Request
	│
	▼
Code Review
	│
	▼
Merge into develop
	│
	▼
Integration Testing
	│
	▼
Release Review
	│
	▼
Merge into main
```

This workflow is intended to improve collaboration, code quality, and integration management.

---

## Branching Strategy

The project will use the following branch structure:

| Branch | Purpose |
|---|---|
| `main` | Stable and approved release code |
| `develop` | Shared integration and testing branch |
| `feature/*` | Individual feature development |
| `bugfix/*` | Bug fixes |
| `hotfix/*` | Urgent fixes, where required and agreed |

### Main Branch

The `main` branch represents stable code that has passed the team's agreed release review and testing process.

Direct pushes should be restricted through GitHub branch protection settings.

### Develop Branch

The `develop` branch serves as the shared integration branch.

Feature branches should be merged into `develop` through Pull Requests after appropriate review.

### Feature Branches

Each developer should create a feature branch from the latest `develop` branch.

Example:

```bash
git switch develop
git pull origin develop
git switch -c feature/backend-product-api
```

Push the feature branch:

```bash
git push -u origin feature/backend-product-api
```

Create a Pull Request targeting `develop`.

### Branch Naming Convention

Use clear and descriptive branch names.

```text
feature/backend-authentication
feature/backend-product-management
feature/frontend-product-listing
feature/frontend-search
bugfix/backend-validation
bugfix/frontend-pagination
```

Avoid vague branch names that do not communicate the purpose of the work.

---

## Pull Request Guidelines

All developers should follow the team's Pull Request process.

### Before Creating a Pull Request

- Ensure the feature is implemented according to the assigned requirements.
- Test the relevant functionality locally.
- Ensure your branch is up to date with the target branch.
- Review your own changes.
- Confirm that sensitive files and credentials are not included.
- Verify that the application still runs as expected.

### Pull Request Requirements

Every Pull Request should include:

- A clear and descriptive title.
- A summary of the changes.
- The relevant feature or issue reference, where available.
- Testing details.
- Any known limitations or integration considerations.

### Review Responsibilities

- Backend changes should be reviewed by an appropriate Backend Lead or designated reviewer.
- Frontend changes should be reviewed by an appropriate Frontend/Software Lead or designated reviewer.
- Changes affecting both applications should involve relevant reviewers from both teams.
- Changes should be merged only after required reviews and checks are completed.

### Merge Policy

- Feature Pull Requests target `develop`.
- Release Pull Requests target `main`.
- Protected branch requirements must be followed.
- Do not bypass review requirements without an agreed project-level exception.

---

## Team Structure

The project consists of 20 developers.

### Backend Team

Total: 10 developers

- Backend Lead 1
- Backend Lead 2
- 8 Backend Developers

### Frontend/Software Team

Total: 10 developers

- Frontend/Software Lead 1
- Frontend/Software Lead 2
- 8 Frontend/Software Developers

### Lead Responsibilities

The leads are responsible for coordinating development within their respective teams, reviewing technical contributions, and supporting integration across the monorepo.

#### Backend Leads

- Coordinate backend implementation.
- Review backend Pull Requests.
- Support API design and consistency.
- Guide backend architecture and coding standards.
- Coordinate backend integration with the frontend team.

#### Frontend/Software Leads

- Coordinate frontend implementation.
- Review frontend Pull Requests.
- Guide UI development and frontend architecture.
- Support frontend-backend integration.
- Maintain consistency in the user experience.

#### Cross-Team Collaboration

Both teams should collaborate on:

- API contracts.
- Data structures.
- Authentication and authorization requirements.
- Product management workflows.
- Search and filtering behavior.
- Integration testing.
- Release readiness.

---

## Project Scope and Priorities

The MVP should prioritize the delivery of core product management and product discovery functionalities.

### Priority 1: Core MVP Features

- Product creation.
- Product updates.
- Product deletion.
- Product listing.
- Product search.
- Product filtering.
- Product sorting.
- Product pagination.
- Role-based product management permissions.

### Priority 2: Supporting Capabilities

- API validation.
- Error handling.
- Backend testing.
- Frontend-backend integration.
- Staff management foundations, if included within the agreed MVP scope.
- Activity/logging functionality, if included within the agreed MVP scope.

### Priority 3: Future Enhancements

Features outside the core MVP should be evaluated based on:

- Available development time.
- Team capacity.
- Technical dependencies.
- Impact on the core search API.
- Impact on the product management requirements.

New features should not compromise the successful delivery of the agreed MVP.

---

## Future Enhancements

The following features may be considered after the core MVP has been implemented and validated.

### 1. User Signup and Login

Allow users to create accounts and authenticate into the platform.

Potential capabilities:

- User registration.
- User login.
- Authentication.
- Role-based access.
- Account management.

### 2. Product Comments and Reviews

Allow users to share feedback on products.

Potential capabilities:

- Product reviews.
- Comment submission.
- Review display.
- Review moderation, if required.

### 3. Product Purchase

Introduce purchasing functionality if the project timeline and technical scope permit.

Potential capabilities:

- Shopping cart.
- Order creation.
- Order management.
- Purchase tracking.
- Payment integration, if approved as part of a future scope.

These features are not required to replace the core MVP priorities and should only be introduced when they fit within the team's delivery plan.

---

## Contribution Guidelines

All team members are expected to follow the agreed development practices.

### General Guidelines

- Work on the appropriate feature branch.
- Keep changes focused on the assigned task.
- Follow established coding conventions.
- Avoid unnecessary changes to unrelated files.
- Test your implementation before creating a Pull Request.
- Document important changes where necessary.
- Communicate blockers with the relevant lead.
- Review other team members' contributions when assigned.

### Code Quality

Developers should aim to produce code that is:

- Readable.
- Maintainable.
- Consistent with the application architecture.
- Appropriately validated.
- Tested where applicable.
- Documented when necessary.

### Monorepo Guidelines

- Keep backend-specific code inside `backend/`.
- Keep frontend-specific code inside `frontend/`.
- Avoid creating separate Git repositories inside the monorepo.
- Coordinate changes to shared configuration and documentation.
- Communicate changes to API contracts with the relevant team.

---

## Project Status

### Current Status

**Project Phase:** MVP Development

**Current Application Foundation:** Backend

The backend application is established as the initial application foundation for the project.

The frontend application will be developed and integrated as a separate application within the monorepo.

### Development Progress

The following areas represent the intended MVP development scope:

- [ ] Backend application foundation
- [ ] Frontend application setup
- [ ] Product data model
- [ ] Product creation
- [ ] Product updates
- [ ] Product deletion
- [ ] Product listing
- [ ] Product search API
- [ ] Product filtering
- [ ] Product sorting
- [ ] Product pagination
- [ ] Role-based access control
- [ ] Frontend-backend integration
- [ ] Integration testing
- [ ] MVP validation

The checklist should be updated as features are implemented and verified.

---

## Project Ownership

**Project:** nestleERP

**Organization:** Group 25 TS Academy Capstone

**Repository:** nestleERP

**Architecture:** Monorepo

**Applications:**
- Backend
- Frontend

**Development Model:** Collaborative team development using Git and GitHub.

---

## Conclusion

nestleERP is being developed as a collaborative mini eCommerce MVP focused on product management and product discovery.

The project emphasizes practical full-stack development, clear application separation, role-based access, effective search functionality, and structured collaboration through version control and Pull Requests.

All team members are encouraged to follow the agreed development workflow, communicate effectively, and prioritize the successful delivery of the core MVP requirements.
