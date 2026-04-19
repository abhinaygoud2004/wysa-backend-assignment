const {
  DEFAULT_MONGO_URI,
  shouldUseMemoryDatabaseFallback,
} = require('../src/db');

describe('shouldUseMemoryDatabaseFallback', () => {
  const connectionError = {
    name: 'MongooseServerSelectionError',
    message: 'connect ECONNREFUSED 127.0.0.1:27017',
  };

  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MONGO_URI;
    delete process.env.USE_IN_MEMORY_DB;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('allows fallback when using the default localhost URI implicitly', () => {
    expect(shouldUseMemoryDatabaseFallback(connectionError, DEFAULT_MONGO_URI)).toBe(true);
  });

  it('allows fallback when the default localhost URI is explicitly set in env', () => {
    process.env.MONGO_URI = DEFAULT_MONGO_URI;

    expect(shouldUseMemoryDatabaseFallback(connectionError, DEFAULT_MONGO_URI)).toBe(true);
  });

  it('skips fallback when a custom Mongo URI is configured', () => {
    process.env.MONGO_URI = 'mongodb+srv://example.mongodb.net/wysa-flow';

    expect(shouldUseMemoryDatabaseFallback(connectionError, DEFAULT_MONGO_URI)).toBe(false);
  });

  it('skips fallback when explicitly disabled', () => {
    process.env.USE_IN_MEMORY_DB = 'false';

    expect(shouldUseMemoryDatabaseFallback(connectionError, DEFAULT_MONGO_URI)).toBe(false);
  });
});
