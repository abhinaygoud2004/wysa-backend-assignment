const express = require('express');

const moduleRoutes = require('./routes/modules');
const userRoutes = require('./routes/users');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

app.use('/api/modules', moduleRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

module.exports = app;