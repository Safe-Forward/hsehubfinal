export const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;
export const credsMissing = !TEST_EMAIL || !TEST_PASSWORD;
