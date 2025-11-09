/**
 * Integration Test: Poll Cleanup Job
 * Validates that expired polls are soft-deleted (is_active = false)
 */

const { getPool } = require('../../src/config/database');
const { executePollCleanup } = require('../../src/jobs/pollCleanup');
const { initializePool, closePool } = require('../../src/config/database');

describe('Poll Cleanup Job Integration Test', () => {
  let pool;

  beforeAll(async () => {
    initializePool();
    pool = getPool();
  });

  afterAll(async () => {
    await closePool();
  });

  afterEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM polls WHERE question LIKE $1', ['%TEST_CLEANUP%']);
  });

  it('should soft-delete expired polls', async () => {
    // Arrange: Create an expired poll
    const expiredPoll = await pool.query(
      `INSERT INTO polls (room_code, question, options, state, expires_at, is_active)
       VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 day', true)
       RETURNING id, room_code`,
      ['TEST01', 'TEST_CLEANUP: Expired Poll', JSON.stringify(['Yes', 'No']), 'closed'],
    );

    const expiredPollId = expiredPoll.rows[0].id;

    // Verify poll is active before cleanup
    const beforeCleanup = await pool.query('SELECT is_active FROM polls WHERE id = $1', [
      expiredPollId,
    ]);
    expect(beforeCleanup.rows[0].is_active).toBe(true);

    // Act: Run cleanup job
    const result = await executePollCleanup();

    // Assert: Poll should be marked inactive
    const afterCleanup = await pool.query('SELECT is_active FROM polls WHERE id = $1', [
      expiredPollId,
    ]);
    expect(afterCleanup.rows[0].is_active).toBe(false);
    expect(result.deletedCount).toBeGreaterThanOrEqual(1);

    const deletedPollRoomCodes = result.polls.map(p => p.roomCode);
    expect(deletedPollRoomCodes).toContain('TEST01');
  });

  it('should not delete active polls that have not expired', async () => {
    // Arrange: Create a non-expired poll
    const activePoll = await pool.query(
      `INSERT INTO polls (room_code, question, options, state, expires_at, is_active)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days', true)
       RETURNING id, room_code`,
      ['TEST02', 'TEST_CLEANUP: Active Poll', JSON.stringify(['Option A', 'Option B']), 'open'],
    );

    const activePollId = activePoll.rows[0].id;

    // Act: Run cleanup job
    await executePollCleanup();

    // Assert: Poll should still be active
    const afterCleanup = await pool.query('SELECT is_active FROM polls WHERE id = $1', [
      activePollId,
    ]);
    expect(afterCleanup.rows[0].is_active).toBe(true);
  });

  it('should not delete already inactive polls', async () => {
    // Arrange: Create an expired but already inactive poll
    const inactivePoll = await pool.query(
      `INSERT INTO polls (room_code, question, options, state, expires_at, is_active)
       VALUES ($1, $2, $3, $4, NOW() - INTERVAL '2 days', false)
       RETURNING id, room_code`,
      [
        'TEST03',
        'TEST_CLEANUP: Already Inactive Poll',
        JSON.stringify(['Yes', 'No']),
        'closed',
      ],
    );

    const inactivePollId = inactivePoll.rows[0].id;

    // Act: Run cleanup job
    const result = await executePollCleanup();

    // Assert: Poll should remain inactive, not be counted in cleanup
    const afterCleanup = await pool.query('SELECT is_active FROM polls WHERE id = $1', [
      inactivePollId,
    ]);
    expect(afterCleanup.rows[0].is_active).toBe(false);

    // The cleanup job should not have processed this poll (it was already inactive)
    const processedRoomCodes = result.polls.map(p => p.roomCode);
    expect(processedRoomCodes).not.toContain('TEST03');
  });

  it('should handle cleanup when no expired polls exist', async () => {
    // Arrange: No expired polls (cleanup all test data first)
    await pool.query('DELETE FROM polls WHERE question LIKE $1', ['%TEST_CLEANUP%']);

    // Act: Run cleanup job
    const result = await executePollCleanup();

    // Assert: Should complete successfully with zero deletions
    expect(result.deletedCount).toBe(0);
    expect(result.polls).toHaveLength(0);
  });
});
