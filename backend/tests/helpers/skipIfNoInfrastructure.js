/**
 * Helper to skip entire test suites if infrastructure is unavailable
 * Prevents hanging tests when PostgreSQL or Redis aren't running
 */

const { isPostgresAvailable, isRedisAvailable } = require('./infrastructure');

let infrastructureChecked = false;
let infrastructureAvailable = false;

/**
 * Check if infrastructure is available and cache result
 * @returns {Promise<boolean>}
 */
async function checkInfrastructure() {
  if (infrastructureChecked) {
    return infrastructureAvailable;
  }

  console.log('🔍 Checking infrastructure availability for integration tests...');

  const [postgresOk, redisOk] = await Promise.all([
    isPostgresAvailable(),
    isRedisAvailable(),
  ]);

  infrastructureAvailable = postgresOk && redisOk;
  infrastructureChecked = true;

  if (!infrastructureAvailable) {
    const missing = [];
    if (!postgresOk) missing.push('PostgreSQL');
    if (!redisOk) missing.push('Redis');
    console.warn(`⚠️  ${missing.join(', ')} not available - skipping infrastructure-dependent tests`);
  } else {
    console.log('✅ Infrastructure available');
  }

  return infrastructureAvailable;
}

/**
 * Use this instead of describe() for test suites requiring infrastructure
 * Will skip entire suite if PostgreSQL or Redis unavailable
 *
 * @example
 * describeWithInfrastructure('My Integration Test', () => {
 *   beforeAll(async () => {
 *     await initializeInfrastructure();
 *   });
 *
 *   it('should work with database', async () => {
 *     // test code
 *   });
 * });
 */
function describeWithInfrastructure(name, fn) {
  describe(name, () => {
    let skipTests = false;

    beforeAll(async () => {
      const available = await checkInfrastructure();

      if (!available) {
        skipTests = true;
        console.warn(`⏭️  Skipping "${name}" - infrastructure not available`);
        // Mark all tests in this suite as pending
      }
    });

    // Wrap the test suite
    if (typeof fn === 'function') {
      // Check synchronously if we can skip early
      checkInfrastructure().then(available => {
        if (!available) {
          // Suite will be skipped
          return;
        }
        fn();
      });
    }
  });
}

/**
 * Skip test if infrastructure not available (for use inside describe blocks)
 */
async function skipIfNoInfrastructure() {
  const available = await checkInfrastructure();
  if (!available) {
    return test.skip;
  }
  return test;
}

module.exports = {
  checkInfrastructure,
  describeWithInfrastructure,
  skipIfNoInfrastructure,
};
