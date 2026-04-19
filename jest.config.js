module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./Backend/tests/setup.js'],
  testMatch: ['**/Backend/tests/**/*.test.js'],
  testTimeout: 30000,
};