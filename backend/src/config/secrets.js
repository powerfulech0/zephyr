/**
 * Secrets Management Abstraction Layer
 *
 * Provides unified interface for accessing secrets from multiple backends:
 * - Environment variables (development, default)
 * - AWS Secrets Manager (AWS deployments)
 * - HashiCorp Vault (on-premises, multi-cloud)
 *
 * Configuration via SECRET_BACKEND environment variable.
 */

const logger = require('./logger');

// Secret backend determined by SECRET_BACKEND env var
const SECRET_BACKEND = process.env.SECRET_BACKEND || 'env';

// Cache for secrets to avoid repeated API calls
const secretsCache = new Map();

/**
 * Get secret from environment variables (default backend)
 * @param {string} key - Secret key
 * @returns {Promise<string|null>}
 */
async function getFromEnv(key) {
  const value = process.env[key];

  if (!value) {
    logger.warn({ key }, 'Secret not found in environment variables');
    return null;
  }

  return value;
}

/**
 * Get secret from AWS Secrets Manager
 * @param {string} key - Secret key (ARN or name)
 * @returns {Promise<string|null>}
 */
async function getFromAWS(key) {
  try {
    // Lazy load AWS SDK to avoid dependency in non-AWS environments
    // eslint-disable-next-line global-require, import/no-unresolved
    const AWS = require('aws-sdk');

    const client = new AWS.SecretsManager({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    const data = await client.getSecretValue({ SecretId: key }).promise();

    if ('SecretString' in data) {
      return data.SecretString;
    }

    // Binary secret (base64 decode)
    const buff = Buffer.from(data.SecretBinary, 'base64');
    return buff.toString('ascii');
  } catch (error) {
    logger.error(
      {
        key,
        error: error.message,
        errorCode: error.code,
      },
      'Failed to retrieve secret from AWS Secrets Manager'
    );

    // If ResourceNotFoundException, secret doesn't exist
    if (error.code === 'ResourceNotFoundException') {
      return null;
    }

    throw error;
  }
}

/**
 * Get secret from HashiCorp Vault
 * @param {string} key - Secret path (e.g., "secret/data/db_password")
 * @returns {Promise<string|null>}
 */
async function getFromVault(key) {
  try {
    // Lazy load node-vault to avoid dependency in non-Vault environments
    // eslint-disable-next-line global-require, import/no-unresolved
    const vault = require('node-vault');

    const vaultClient = vault({
      endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN,
    });

    // Vault KV v2 stores secrets at secret/data/<path>
    const result = await vaultClient.read(key);

    if (!result || !result.data || !result.data.data) {
      logger.warn({ key }, 'Secret not found in Vault');
      return null;
    }

    // Vault KV v2 wraps value in data.data
    // Assume secret has a 'value' field, or return entire data object
    return result.data.data.value || JSON.stringify(result.data.data);
  } catch (error) {
    logger.error(
      {
        key,
        error: error.message,
        vaultAddr: process.env.VAULT_ADDR,
      },
      'Failed to retrieve secret from Vault'
    );

    // If 404, secret doesn't exist
    if (error.response && error.response.statusCode === 404) {
      return null;
    }

    throw error;
  }
}

/**
 * Get secret from configured backend
 * @param {string} key - Secret key/path
 * @param {Object} options - Options
 * @param {boolean} options.cache - Whether to cache secret (default: true)
 * @param {boolean} options.required - Whether secret is required (default: false)
 * @returns {Promise<string|null>}
 * @throws {Error} if secret is required but not found
 */
async function getSecret(key, options = {}) {
  const { cache = true, required = false } = options;

  // Check cache first
  if (cache && secretsCache.has(key)) {
    logger.debug({ key }, 'Secret retrieved from cache');
    return secretsCache.get(key);
  }

  let value = null;

  // Retrieve from backend
  switch (SECRET_BACKEND) {
    case 'aws':
      value = await getFromAWS(key);
      break;

    case 'vault':
      value = await getFromVault(key);
      break;

    case 'env':
    default:
      value = await getFromEnv(key);
      break;
  }

  // Handle required secrets
  if (required && !value) {
    throw new Error(
      `Required secret not found: ${key} (backend: ${SECRET_BACKEND}). ` +
        `Ensure the secret is configured in your secret store.`
    );
  }

  // Cache the secret
  if (cache && value) {
    secretsCache.set(key, value);
  }

  logger.debug({ key, backend: SECRET_BACKEND, found: !!value }, 'Secret retrieved');

  return value;
}

/**
 * Get multiple secrets at once
 * @param {string[]} keys - Array of secret keys
 * @param {Object} options - Options
 * @returns {Promise<Object>} - Object with keys and values
 */
async function getSecrets(keys, options = {}) {
  const results = {};

  await Promise.all(
    keys.map(async (key) => {
      try {
        results[key] = await getSecret(key, options);
      } catch (error) {
        logger.error({ key, error: error.message }, 'Failed to retrieve secret');
        results[key] = null;
      }
    })
  );

  return results;
}

/**
 * Clear secrets cache
 * Useful for testing or when secrets are rotated
 */
function clearCache() {
  secretsCache.clear();
  logger.info('Secrets cache cleared');
}

/**
 * Preload secrets at startup to fail fast
 * @param {string[]} keys - Array of required secret keys
 * @returns {Promise<void>}
 * @throws {Error} if any required secret is missing
 */
async function preloadSecrets(keys) {
  logger.info({ keys, backend: SECRET_BACKEND }, 'Preloading required secrets');

  const results = await Promise.allSettled(
    keys.map((key) => getSecret(key, { required: true }))
  );

  const failures = results.filter((r) => r.status === 'rejected');

  if (failures.length > 0) {
    const errors = failures.map((f) => f.reason.message);
    throw new Error(
      `Failed to preload required secrets:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }

  logger.info({ count: keys.length }, 'All required secrets loaded successfully');
}

module.exports = {
  getSecret,
  getSecrets,
  clearCache,
  preloadSecrets,
};
