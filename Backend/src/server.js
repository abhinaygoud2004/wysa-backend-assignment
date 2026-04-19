require('dotenv').config();

const app = require('./app');
const { connectDatabase } = require('./db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectDatabase();
  console.log('MongoDB connected');

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to connect to MongoDB:', error);
  process.exit(1);
});
