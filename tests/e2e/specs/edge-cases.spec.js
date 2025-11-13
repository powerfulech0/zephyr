/**
 * E2E Test Spec: Edge Cases Testing
 *
 * Purpose: Test boundary conditions and unusual scenarios from spec.md Edge Cases section
 *
 * Test Scenarios:
 * - T049: WebSocket connection drops during vote submission
 * - T050: Concurrent vote submissions from same participant
 * - T051: Backend server restarts while polls active
 * - T052: Room code generation collision handling
 * - T053: Host opens voting, closes it, then opens again
 * - T054: Participant attempts join after voting closes
 * - T055: Browser localStorage full or disabled
 * - T056: Maximum participant limits (20+ users)
 * - T057: Network latency exceeds 5 seconds
 * - T058: Malformed WebSocket messages
 */

const { test, expect } = require('@playwright/test');
const { generatePoll, generateParticipant } = require('../fixtures/pollData');
const HostDashboardPage = require('../pages/HostDashboardPage');
const JoinPage = require('../pages/JoinPage');
const VotePage = require('../pages/VotePage');
const { captureSocketEvents, waitForSocketEvent } = require('../helpers/websocketHelpers');
const { createMultipleContexts } = require('../helpers/browserHelpers');
const { simulateDisconnection, simulateSlowNetwork, restoreNetworkConditions } = require('../helpers/networkHelpers');

test.describe('Edge Cases Testing', () => {
  /**
   * T049: WebSocket connection drops during vote submission
   *
   * GIVEN a participant is submitting a vote
   * WHEN the WebSocket connection drops during submission
   * THEN the vote is handled correctly (either queued and retried, or error shown)
   */
  test('T049 - WebSocket connection drops during vote submission', async ({ page }) => {
    const testPoll = generatePoll({ options: ['Option A', 'Option B', 'Option C'] });
    const testParticipant = generateParticipant();

    // Setup: Host creates and opens poll
    const hostContext = await page.context().browser().newContext();
    const hostPage = await hostContext.newPage();
    const hostDashboard = new HostDashboardPage(hostPage);
    await hostDashboard.goto();
    await hostDashboard.createPoll(testPoll.question, testPoll.options);
    const roomCode = await hostDashboard.getRoomCode();
    await hostDashboard.openVoting();

    // Participant joins poll
    const joinPage = new JoinPage(page);
    await joinPage.goto();
    await joinPage.joinPoll(roomCode, testParticipant.nickname);

    const votePage = new VotePage(page);
    await votePage.selectOption(testPoll.options[0]);

    // Disconnect network right before vote submission
    await page.context().setOffline(true);

    // Try to submit vote while offline
    await votePage.submitVote();
    await page.waitForTimeout(500);

    // Restore connection
    await page.context().setOffline(false);
    await page.waitForTimeout(2000); // Wait for reconnection

    // Verify vote was either:
    // 1. Queued and submitted after reconnection, OR
    // 2. User can retry submission
    const confirmation = await votePage.getConfirmation().catch(() => '');
    const hasError = await page.locator('.error-message, .alert-danger').isVisible({ timeout: 1000 }).catch(() => false);

    if (hasError || confirmation === '') {
      // If vote failed, user should be able to retry
      await votePage.selectOption(testPoll.options[0]);
      await votePage.submitVote();
      const retryConfirmation = await votePage.getConfirmation();
      expect(retryConfirmation).toContain('recorded');
    } else {
      // Vote was queued and submitted automatically
      expect(confirmation).toContain('recorded');
    }

    await hostContext.close();
    console.log('✓ WebSocket disconnection during vote submission handled correctly');
  });

  /**
   * T050: Concurrent vote submissions from same participant
   *
   * GIVEN a participant has voted
   * WHEN they rapidly submit multiple vote changes
   * THEN the system handles the race condition correctly (only latest vote is recorded)
   */
  test('T050 - Concurrent vote submissions from same participant', async ({ page }) => {
    const testPoll = generatePoll({ options: ['Option A', 'Option B', 'Option C'] });
    const testParticipant = generateParticipant();

    // Setup
    const hostContext = await page.context().browser().newContext();
    const hostPage = await hostContext.newPage();
    const hostDashboard = new HostDashboardPage(hostPage);
    await hostDashboard.goto();
    await hostDashboard.createPoll(testPoll.question, testPoll.options);
    const roomCode = await hostDashboard.getRoomCode();
    await hostDashboard.openVoting();

    const joinPage = new JoinPage(page);
    await joinPage.goto();
    await joinPage.joinPoll(roomCode, testParticipant.nickname);

    const votePage = new VotePage(page);

    // Rapidly submit multiple votes (simulate race condition)
    const votePromises = [];
    for (let i = 0; i < testPoll.options.length; i++) {
      votePromises.push(
        (async () => {
          await votePage.selectOption(testPoll.options[i]);
          await votePage.submitVote();
        })()
      );
    }

    await Promise.all(votePromises);
    await page.waitForTimeout(1000); // Let backend process all requests

    // Verify only one vote is recorded for this participant
    const results = await hostDashboard.getResults();
    const totalVotesForParticipant = Object.values(results).reduce((sum, count) => sum + count, 0);

    expect(totalVotesForParticipant).toBe(1); // Only one vote should be counted

    await hostContext.close();
    console.log('✓ Concurrent vote submissions handled correctly');
  });

  /**
   * T053: Host opens voting, closes it, then opens again
   *
   * GIVEN a host has created a poll
   * WHEN they open voting, close it, then open it again
   * THEN the system handles the state transitions correctly
   */
  test('T053 - Host opens voting, closes it, then opens again', async ({ page }) => {
    const testPoll = generatePoll({ options: ['Option A', 'Option B', 'Option C'] });

    const hostPage = new HostDashboardPage(page);
    await hostPage.goto();
    await hostPage.createPoll(testPoll.question, testPoll.options);

    // First: Open voting
    await hostPage.openVoting();
    let pollState = await hostPage.getPollState();
    expect(pollState).toBe('open');

    // Then: Close voting
    await hostPage.closeVoting();
    pollState = await hostPage.getPollState();
    expect(pollState).toBe('closed');

    // Finally: Open voting again
    await hostPage.openVoting();
    pollState = await hostPage.getPollState();
    expect(pollState).toBe('open');

    console.log('✓ Multiple poll state transitions handled correctly');
  });

  /**
   * T054: Participant attempts join after voting closes
   *
   * GIVEN a poll has voting closed
   * WHEN a participant attempts to join
   * THEN they receive an appropriate error or message
   */
  test('T054 - Participant attempts join after voting closes', async ({ page }) => {
    const testPoll = generatePoll({ options: ['Option A', 'Option B', 'Option C'] });
    const testParticipant = generateParticipant();

    // Setup: Host creates poll and closes voting
    const hostContext = await page.context().browser().newContext();
    const hostPage = await hostContext.newPage();
    const hostDashboard = new HostDashboardPage(hostPage);
    await hostDashboard.goto();
    await hostDashboard.createPoll(testPoll.question, testPoll.options);
    const roomCode = await hostDashboard.getRoomCode();
    await hostDashboard.openVoting();
    await hostDashboard.closeVoting();

    // Participant tries to join after voting is closed
    const joinPage = new JoinPage(page);
    await joinPage.goto();
    await joinPage.joinPoll(roomCode, testParticipant.nickname);

    // Check if join was successful or if there's an error/warning
    const joinSuccess = await joinPage.isJoinSuccessful().catch(() => false);
    const errorMessage = await joinPage.getErrorMessage().catch(() => '');

    // If join was successful, voting should be disabled
    if (joinSuccess) {
      const votePage = new VotePage(page);
      const votingDisabled = await votePage.isVotingDisabled();
      expect(votingDisabled).toBe(true);
    } else {
      // If join failed, there should be an error message
      expect(errorMessage.length).toBeGreaterThan(0);
    }

    await hostContext.close();
    console.log('✓ Joining after voting closes handled correctly');
  });

  /**
   * T055: Browser localStorage full or disabled
   *
   * GIVEN browser localStorage is disabled or full
   * WHEN participant tries to use the application
   * THEN the application handles gracefully (degrades or shows error)
   */
  test('T055 - Browser localStorage full or disabled', async ({ page }) => {
    const testPoll = generatePoll({ options: ['Option A', 'Option B', 'Option C'] });
    const testParticipant = generateParticipant();

    // Setup: Host creates and opens poll
    const hostContext = await page.context().browser().newContext();
    const hostPage = await hostContext.newPage();
    const hostDashboard = new HostDashboardPage(hostPage);
    await hostDashboard.goto();
    await hostDashboard.createPoll(testPoll.question, testPoll.options);
    const roomCode = await hostDashboard.getRoomCode();
    await hostDashboard.openVoting();

    // Disable localStorage by overriding its methods
    await page.addInitScript(() => {
      const mockStorage = {};
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: (key) => mockStorage[key] || null,
          setItem: (key, value) => {
            throw new Error('QuotaExceededError: localStorage is disabled');
          },
          removeItem: (key) => {
            delete mockStorage[key];
          },
          clear: () => {
            Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
          },
        },
        writable: false,
      });
    });

    // Try to join poll with localStorage disabled
    const joinPage = new JoinPage(page);
    await joinPage.goto();

    // Application should either:
    // 1. Work without localStorage (graceful degradation), OR
    // 2. Show error message about storage requirement

    await joinPage.joinPoll(roomCode, testParticipant.nickname);

    // Check if application handled the localStorage issue
    const hasError = await page.locator('.error-message, .alert-danger, .alert-warning').isVisible({ timeout: 2000 }).catch(() => false);
    const joinSuccessful = await joinPage.isJoinSuccessful().catch(() => false);

    // Application should either work or show error (not crash)
    const handledGracefully = hasError || joinSuccessful;
    expect(handledGracefully).toBe(true);

    await hostContext.close();
    console.log('✓ localStorage disabled/full handled gracefully');
  });

  /**
   * T056: Maximum participant limits (20+ users)
   *
   * GIVEN a poll is active
   * WHEN 20+ participants try to join
   * THEN the system maintains performance and accuracy
   */
  test('T056 - Maximum participant limits (20+ users)', async ({ page, browser }) => {
    const testPoll = generatePoll({ options: ['Option A', 'Option B', 'Option C'] });
    const participantCount = 20;

    // Setup: Host creates and opens poll
    const hostPage = new HostDashboardPage(page);
    await hostPage.goto();
    await hostPage.createPoll(testPoll.question, testPoll.options);
    const roomCode = await hostPage.getRoomCode();
    await hostPage.openVoting();

    // Create 20 participant contexts
    const participantContexts = await createMultipleContexts(browser, participantCount);

    try {
      // Join poll with all participants concurrently
      const joinPromises = participantContexts.map(async ({ context, page: participantPage }) => {
        const participant = generateParticipant();
        const joinPage = new JoinPage(participantPage);
        await joinPage.goto();
        await joinPage.joinPoll(roomCode, participant.nickname);
        return joinPage.isJoinSuccessful();
      });

      const joinResults = await Promise.all(joinPromises);
      const successfulJoins = joinResults.filter((success) => success === true).length;

      // Verify at least most participants joined successfully
      expect(successfulJoins).toBeGreaterThanOrEqual(18); // Allow for some potential failures

      // Verify host sees correct participant count
      await page.waitForTimeout(2000); // Give time for all joins to propagate
      const participantCountOnHost = await hostPage.getParticipantCount();
      expect(participantCountOnHost).toBeGreaterThanOrEqual(18);
      expect(participantCountOnHost).toBeLessThanOrEqual(participantCount);

      // Have all participants vote
      const votePromises = participantContexts.map(async ({ context, page: participantPage }) => {
        const votePage = new VotePage(participantPage);
        const randomOption = testPoll.options[Math.floor(Math.random() * testPoll.options.length)];
        await votePage.selectOption(randomOption);
        await votePage.submitVote();
        return votePage.getConfirmation();
      });

      await Promise.all(votePromises);
      await page.waitForTimeout(2000); // Give time for votes to propagate

      // Verify vote counts are accurate
      const results = await hostPage.getResults();
      const totalVotes = Object.values(results).reduce((sum, count) => sum + count, 0);
      expect(totalVotes).toBeGreaterThanOrEqual(18);
      expect(totalVotes).toBeLessThanOrEqual(participantCount);

      console.log(`✓ System handled ${successfulJoins} concurrent participants successfully`);
    } finally {
      // Cleanup: Close all participant contexts
      for (const { context } of participantContexts) {
        await context.close();
      }
    }
  });

  /**
   * T057: Network latency exceeds 5 seconds
   *
   * GIVEN high network latency conditions
   * WHEN operations timeout
   * THEN timeouts are handled correctly
   */
  test('T057 - Network latency exceeds 5 seconds', async ({ page }) => {
    const testPoll = generatePoll({ options: ['Option A', 'Option B', 'Option C'] });
    const testParticipant = generateParticipant();

    // Setup: Host creates and opens poll
    const hostContext = await page.context().browser().newContext();
    const hostPage = await hostContext.newPage();
    const hostDashboard = new HostDashboardPage(hostPage);
    await hostDashboard.goto();
    await hostDashboard.createPoll(testPoll.question, testPoll.options);
    const roomCode = await hostDashboard.getRoomCode();
    await hostDashboard.openVoting();

    // Participant joins poll
    const joinPage = new JoinPage(page);
    await joinPage.goto();
    await joinPage.joinPoll(roomCode, testParticipant.nickname);

    const votePage = new VotePage(page);
    await votePage.selectOption(testPoll.options[0]);

    // Simulate extremely high latency (5+ seconds)
    await simulateSlowNetwork(page, {
      latency: 5500, // 5.5 seconds latency
      downloadThroughput: 1000, // Very slow download (1 KB/s)
      uploadThroughput: 1000, // Very slow upload (1 KB/s)
    });

    // Try to submit vote with high latency
    const voteSubmissionStart = Date.now();

    try {
      await votePage.submitVote();
      const voteSubmissionTime = Date.now() - voteSubmissionStart;

      // Vote submission should either succeed (slowly) or timeout with error
      const confirmation = await votePage.getConfirmation().catch(() => '');
      const hasError = await page.locator('.error-message, .alert-danger').isVisible({ timeout: 1000 }).catch(() => false);

      // One of these should be true
      expect(confirmation.length > 0 || hasError).toBe(true);

      console.log(`✓ High latency handled correctly (submission took ${voteSubmissionTime}ms)`);
    } finally {
      // Restore normal network conditions
      await restoreNetworkConditions(page);
      await hostContext.close();
    }
  });

  /**
   * T058: Malformed WebSocket messages
   *
   * GIVEN the WebSocket connection is established
   * WHEN malformed messages are sent
   * THEN the system validates and rejects them without crashing
   */
  test('T058 - Malformed WebSocket messages', async ({ page }) => {
    const testPoll = generatePoll({ options: ['Option A', 'Option B', 'Option C'] });
    const testParticipant = generateParticipant();

    // Setup: Host creates and opens poll
    const hostContext = await page.context().browser().newContext();
    const hostPage = await hostContext.newPage();
    const hostDashboard = new HostDashboardPage(hostPage);
    await hostDashboard.goto();
    await hostDashboard.createPoll(testPoll.question, testPoll.options);
    const roomCode = await hostDashboard.getRoomCode();
    await hostDashboard.openVoting();

    // Participant joins poll
    const joinPage = new JoinPage(page);
    await joinPage.goto();
    await joinPage.joinPoll(roomCode, testParticipant.nickname);

    // Inject malformed WebSocket messages
    await page.evaluate(() => {
      if (window.socket) {
        // Try to emit malformed events
        try {
          // Missing required fields
          window.socket.emit('submit-vote', {});

          // Invalid data types
          window.socket.emit('submit-vote', { selectedOption: 12345 });

          // Null/undefined values
          window.socket.emit('submit-vote', { selectedOption: null });

          // Extremely large payload
          window.socket.emit('submit-vote', { selectedOption: 'A'.repeat(100000) });
        } catch (error) {
          console.log('Malformed message injection error:', error);
        }
      }
    });

    await page.waitForTimeout(1000);

    // Verify application is still functional after malformed messages
    const votePage = new VotePage(page);
    await votePage.selectOption(testPoll.options[0]);
    await votePage.submitVote();

    const confirmation = await votePage.getConfirmation();
    expect(confirmation).toContain('recorded');

    // Verify host dashboard is still functional
    const results = await hostDashboard.getResults();
    expect(results).toBeDefined();

    await hostContext.close();
    console.log('✓ Malformed WebSocket messages handled without crashing');
  });

  /**
   * T051: Backend server restarts while polls active
   * (Skipped in E2E tests - would require infrastructure control)
   *
   * Note: This test is difficult to implement in E2E environment without
   * Docker orchestration or process control. Should be covered by:
   * - Manual testing during deployment
   * - Integration tests with mock backend restarts
   */
  test.skip('T051 - Backend server restarts while polls active', async () => {
    // Requires infrastructure control to restart backend
    console.log('⊘ Skipped: Requires backend restart capability');
  });

  /**
   * T052: Room code generation collision handling
   * (Skipped - extremely rare edge case, difficult to simulate)
   *
   * Note: Room code collisions are probabilistically rare with 6-character
   * alphanumeric codes (32^6 = 1B+ combinations). Backend should handle
   * collisions by regenerating codes. Covered by unit tests in backend.
   */
  test.skip('T052 - Room code generation collision handling', async () => {
    // Would require creating billions of polls to force collision
    console.log('⊘ Skipped: Probabilistically rare, covered by unit tests');
  });
});
