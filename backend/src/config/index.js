require('dotenv').config();

/**
 * Application Configuration with Validation
 *
 * Loads and validates all environment variables at startup.
 * Fails fast with descriptive errors if required variables are missing or invalid.
 * This ensures deployment failures happen at startup, not during runtime.
 */

/**
 * Helper: Get required environment variable
 * @param {string} name - Environment variable name
 * @param {string} defaultValue - Default value (optional)
 * @returns {string}
 * @throws {Error} if variable is missing and no default provided
 */
function getEnv(name, defaultValue = null) {
  const value = process.env[name];

  if (!value && defaultValue === null) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Please set it in your .env file or environment.`
    );
  }

  return value || defaultValue;
}

/**
 * Helper: Get environment variable as number
 * @param {string} name - Environment variable name
 * @param {number} defaultValue - Default value
 * @returns {number}
 * @throws {Error} if value is not a valid number
 */
function getEnvAsNumber(name, defaultValue) {
  const value = process.env[name];

  if (!value) {
    return defaultValue;
  }

  const num = parseInt(value, 10);

  if (Number.isNaN(num)) {
    throw new Error(`Environment variable ${name} must be a number, got: ${value}`);
  }

  return num;
}

/**
 * Helper: Get environment variable as boolean
 * @param {string} name - Environment variable name
 * @param {boolean} defaultValue - Default value
 * @returns {boolean}
 */
function getEnvAsBoolean(name, defaultValue) {
  const value = process.env[name];

  if (!value) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true';
}

/**
 * Helper: Get environment variable as array (comma-separated)
 * @param {string} name - Environment variable name
 * @param {array} defaultValue - Default value
 * @returns {array}
 */
function getEnvAsArray(name, defaultValue = []) {
  const value = process.env[name];

  if (!value) {
    return defaultValue;
  }

  return value.split(',').map((item) => item.trim());
}

/**
 * Validate configuration based on environment
 * In production, all critical variables must be set
 */
function validateConfig(config) {
  const errors = [];

  // Production-specific validations
  if (config.nodeEnv === 'production') {
    // Database credentials required in production
    if (!process.env.DB_HOST) {
      errors.push('DB_HOST is required in production');
    }
    if (!process.env.DB_PASSWORD) {
      errors.push('DB_PASSWORD is required in production');
    }

    // Redis required in production
    if (!process.env.REDIS_HOST) {
      errors.push('REDIS_HOST is required in production');
    }

    // CORS origins should be explicitly set in production
    if (!process.env.ALLOWED_ORIGINS) {
      errors.push(
        'ALLOWED_ORIGINS is required in production (comma-separated list of allowed origins)'
      );
    }
  }

  // Port validation
  if (config.port < 1 || config.port > 65535) {
    errors.push(`PORT must be between 1 and 65535, got: ${config.port}`);
  }

  // Log level validation (silent allowed for testing)
  const validLogLevels = ['debug', 'info', 'warn', 'error', 'silent'];
  if (!validLogLevels.includes(config.logLevel)) {
    errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}, got: ${config.logLevel}`);
  }

  // Node environment validation
  const validEnvs = ['development', 'test', 'production'];
  if (!validEnvs.includes(config.nodeEnv)) {
    errors.push(`NODE_ENV must be one of: ${validEnvs.join(', ')}, got: ${config.nodeEnv}`);
  }

  // Database pool validation
  if (config.database.poolMax < 1 || config.database.poolMax > 100) {
    errors.push(`DB_POOL_MAX must be between 1 and 100, got: ${config.database.poolMax}`);
  }

  // If there are validation errors, throw
  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
}

// Build configuration object
const config = {
  // Server
  port: getEnvAsNumber('PORT', 4000),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  logLevel: getEnv('LOG_LEVEL', 'info'),
  frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:3000'),

  // Database
  database: {
    host: getEnv('DB_HOST', 'localhost'),
    port: getEnvAsNumber('DB_PORT', 5432),
    name: getEnv('DB_NAME', 'zephyr_dev'),
    user: getEnv('DB_USER', 'zephyr'),
    password: getEnv('DB_PASSWORD', 'zephyr_dev_password'),
    poolMax: getEnvAsNumber('DB_POOL_MAX', 20),
    queryTimeout: getEnvAsNumber('DB_QUERY_TIMEOUT', 2000),
  },

  // Redis
  redis: {
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getEnvAsNumber('REDIS_PORT', 6379),
    password: getEnv('REDIS_PASSWORD', ''),
    timeout: getEnvAsNumber('REDIS_TIMEOUT', 1000),
  },

  // CORS
  cors: {
    origins: getEnvAsArray('ALLOWED_ORIGINS', ['http://localhost:3000', 'http://127.0.0.1:3000']),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: getEnvAsNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    max: getEnvAsNumber('RATE_LIMIT_MAX', 100),
  },

  // Data Retention
  retention: {
    pollDays: getEnvAsNumber('POLL_RETENTION_DAYS', 30),
    auditLogDays: getEnvAsNumber('AUDIT_LOG_RETENTION_DAYS', 90),
  },

  // Secret Management
  secrets: {
    backend: getEnv('SECRET_BACKEND', 'env'), // Options: env, vault, aws
  },

  // Host Authentication (optional)
  hostAuth: {
    enabled: getEnvAsBoolean('HOST_AUTH_ENABLED', false),
    secret: process.env.HOST_AUTH_SECRET || null,
  },

  // Feature Flags
  features: {
    metrics: getEnvAsBoolean('ENABLE_METRICS', true),
    auditLogging: getEnvAsBoolean('ENABLE_AUDIT_LOGGING', true),
  },
};

// Validate configuration
try {
  validateConfig(config);
} catch (error) {
  // In test environment, throw error instead of exiting
  if (config.nodeEnv === 'test') {
    throw error;
  }
  console.error('❌ Configuration Error:', error.message);
  process.exit(1);
}

// Log configuration summary on startup (redact sensitive values)
if (config.nodeEnv !== 'test') {
  console.log('✅ Configuration loaded successfully');
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
  console.log(`   Redis: ${config.redis.host}:${config.redis.port}`);
  console.log(`   CORS Origins: ${config.cors.origins.join(', ')}`);
}

module.exports = config;
