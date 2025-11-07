require('dotenv').config();

const config = {
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
};

module.exports = config;
