# Backend Test Suite

This folder contains the core backend checks for the project.

- `app.test.js`: app boot and critical route checks
- `critical-behavior.test.js`: validation of key API behaviors
- `account-security.test.js`: first-login password change, Super Admin bootstrap, and password reset security
- `database-integration.test.js`: Mongo-backed integration tests when `MONGODB_TEST_URI` is set
- `email.test.js`: SMTP email delivery check for staff account emails

Run all tests with:

```bash
npm test
```

Use a dedicated MongoDB test database URI for DB integration tests:

```bash
MONGODB_TEST_URI=mongodb://127.0.0.1:27017/nestleERP_test npm test
```
