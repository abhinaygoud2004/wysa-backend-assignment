const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/wysa-flow';

let memoryServer;

function shouldUseMemoryDatabaseFallback(error, mongoUri) {
  const isDefaultLocalUri = mongoUri === DEFAULT_MONGO_URI;
  const hasExplicitMongoUri = Boolean(process.env.MONGO_URI);
  const fallbackEnabled = process.env.USE_IN_MEMORY_DB !== 'false';
  const isLocalConnectionFailure =
    error?.name === 'MongooseServerSelectionError' &&
    /(ECONNREFUSED|EPERM|localhost:27017|127\.0\.0\.1:27017|::1:27017)/.test(
      String(error?.message || '')
    );

  return isDefaultLocalUri && !hasExplicitMongoUri && fallbackEnabled && isLocalConnectionFailure;
}

async function connectToMemoryDatabase() {
  if (!memoryServer) {
    memoryServer = await MongoMemoryServer.create({
      instance: {
        ip: '127.0.0.1',
      },
    });
  }

  const memoryUri = memoryServer.getUri();
  await mongoose.connect(memoryUri);
  return mongoose.connection;
}

async function connectDatabase(mongoUri = process.env.MONGO_URI || DEFAULT_MONGO_URI) {
  try {
    await mongoose.connect(mongoUri);
    return mongoose.connection;
  } catch (error) {
    if (!shouldUseMemoryDatabaseFallback(error, mongoUri)) {
      throw error;
    }

    console.warn(
      'MongoDB is not running on localhost:27017. Falling back to an in-memory database for local development.'
    );

    return connectToMemoryDatabase();
  }
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  DEFAULT_MONGO_URI,
};