# Backend Tests

Run the route and unit tests from the repository root with `npm test` (or from `backend` with `npm test`).

`critical-behavior.test.js` checks product responses, login behavior, authorization, expired tokens, and invalid registration/product requests. These tests mock database methods.

`database-integration.test.js` checks user/product persistence, staff first-login password changes, one-time Super Admin bootstrap, and OTP password resets for each role against MongoDB. Email delivery is mocked. Start a local MongoDB instance, then set a test-only URI before running the suite:

```powershell
$env:MONGODB_TEST_URI = "mongodb://127.0.0.1:27017/nestleERP_test"
npm test
```

The database name must contain `test`. These tests clear the `Product` and `User` collections after each case. Without `MONGODB_TEST_URI`, only the database integration tests are skipped; the other tests still run.

Use a disposable test database only. Tests clear the `User`, `Product`, and bootstrap-state collections. The integration setup also clears these collections before the first test run.
