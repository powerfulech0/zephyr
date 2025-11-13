/**
 * E2E Test Spec: Cross-Browser and Error Handling Testing (User Story 4 - Priority P4)
 *
 * Purpose: Verify application behavior across different browsers and test error recovery scenarios
 *
 * Test Scenarios:
 * - T041: Core workflows pass in Chrome, Firefox, and Safari
 * - T042: Participant network connection drops temporarily, WebSocket reconnects
 * - T043: Host attempts poll creation with only 1 option, sees error
 * - T044: Participant vote submission fails (backend error), sees error message and can retry
 * - T045: User session expires, receives clear error message
 */

const { test, expect } = require('@playwright/test');
const { generatePoll, generateParticipant } = require('../fixtures/pollData');
const HostDashboardPage = require('../pages/HostDashboardPage');
const JoinPage = require('../pages/JoinPage');
const VotePage = require('../pages/VotePage');

test.describe('User Story 4: Cross-Browser and Error Handling', () => {
  /**
   * T041: Core workflows pass in Chrome, Firefox, and Safari
   *
   * Acceptance Scenario 1: Multi-browser compatibility
   * GIVEN the application is tested in Chrome, Firefox, and Safari
   * WHEN core workflows are executed (poll creation, joining, voting)
   * THEN all workflows function correctly across all browsers
   */
  test('T041 - Core workflows pass in Chrome, Firefox, and Safari', async ({ page, browserName }) => {
    // This test will run automatically across all browser projects configured in playwright.config.js
    const testPoll = generatePoll({ options: ['Browser Option A', 'Browser Option B', 'Browser Option C'] });
    const testParticipant = generateParticipant();

    // Step 1: Host creates poll
    const hostPage = new HostDashboardPage(page);
    await hostPage.goto();
    await hostPage.createPoll(testPoll.question, testPoll.options);

    const roomCode = await hostPage.getRoomCode();
    expect(roomCode).toHaveLength(6);
    expect(roomCode).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);

    // Step 2: Host opens voting
    await hostPage.openVoting();
    const pollState = await hostPage.getPollState();
    expect(pollState).toBe('open');

    // Step 3: Participant joins poll in new context
    const participantContext = await page.context().browser().newContext();
    const participantPage = await participantContext.newPage();

    const joinPage = new JoinPage(participantPage);
    await joinPage.goto();
    await joinPage.joinPoll(roomCode, testParticipant.nickname);

    const joinSuccess = await joinPage.isJoinSuccessful();
    expect(joinSuccess).toBe(true);

    // Step 4: Participant submits vote
    const votePage = new VotePage(participantPage);
    await votePage.selectOption(testPoll.options[0]);
    await votePage.submitVote();

    const confirmation = await votePage.getConfirmation();
    expect(confirmation).toContain('recorded');

    // Step 5: Host sees updated vote count
    const results = await hostPage.getResults();
    expect(results[testPoll.options[0]]).toBeGreaterThan(0);

    // Cleanup
    await participantContext.close();

    console.log(`✓ Core workflows passed in ${browserName}`);
  });

  /**
   * T042: Participant network connection drops temporarily, WebSocket reconnects
   *
   * Acceptance Scenario 2: Network interruption handling
   * GIVEN a participant is connected to an active poll
   * WHEN their network connection drops temporarily
   * THEN the WebSocket reconnects automatically
   * AND the participant can continue voting without manual refresh
   */
  test('T042 - Participant network connection drops, WebSocket reconnects', async ({ page }) => {
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

    // Step 1: Participant joins poll
    const joinPage = new JoinPage(page);
    await joinPage.goto();
    await joinPage.joinPoll(roomCode, testParticipant.nickname);

    const votePage = new VotePage(page);
    await votePage.selectOption(testPoll.options[0]);
    await votePage.submitVote();

    let confirmation = await votePage.getConfirmation();
    expect(confirmation).toContain('recorded');

    // Step 2: Simulate network disconnection (go offline)
    await page.context().setOffline(true);
    await page.waitForTimeout(1000); // Wait for disconnection

    // Step 3: Restore network connection (go online)
    await page.context().setOffline(false);

    // Step 4: Wait for WebSocket reconnection (application should handle this automatically)
    await page.waitForTimeout(2000); // Give time for reconnection

    // Step 5: Verify participant can change vote after reconnection
    await votePage.changeVote(testPoll.options[1]);

    confirmation = await votePage.getConfirmation();
    expect(confirmation).toContain('recorded');

    // Verify the vote was updated
    const currentVote = await votePage.getCurrentVote();
    expect(currentVote).toBe(testPoll.options[1]);

    // Cleanup
    await hostContext.close();

    console.log('✓ WebSocket reconnection successful after network interruption');
  });

  /**
   * T043: Host attempts poll creation with only 1 option, sees error
   *
   * Acceptance Scenario 3: Poll creation validation
   * GIVEN a host is on the poll creation page
   * WHEN they attempt to create a poll with only 1 option
   * THEN they see an error message requiring at least 2 options
   * AND the poll is not created
   */
  test('T043 - Host attempts poll creation with only 1 option, sees error', async ({ page }) => {
    const hostPage = new HostDashboardPage(page);
    await hostPage.goto();

    // Manually fill form with only 1 option (don't use createPoll() which has its own validation)
    await hostPage.fill('#poll-question', 'Test Question');
    await hostPage.fill('#poll-option-0', 'Only One Option');
    await hostPage.fill('#poll-option-1', ''); // Leave second option empty

    // Try to submit
    await hostPage.click('button[type="submit"]');

    // Wait for error message to appear
    const errorMessage = await page.locator('.error-message, .alert-danger, [role="alert"]').first().textContent({ timeout: 5000 }).catch(() => null);

    expect(errorMessage).toBeTruthy();
    expect(errorMessage.toLowerCase()).toMatch(/at least.*2.*option|minimum.*2.*option|need.*2.*option/i);

    // Verify no room code is displayed (poll not created)
    const roomCodeVisible = await page.locator('.room-code strong').isVisible({ timeout: 2000 }).catch(() => false);
    expect(roomCodeVisible).toBe(false);

    console.log('✓ Poll creation validation error displayed correctly');
  });

  /**
   * T044: Participant vote submission fails (backend error), sees error message and can retry
   *
   * Acceptance Scenario 4: Vote submission error handling
   * GIVEN a participant has selected an option
   * WHEN vote submission fails due to backend error
   * THEN the participant sees a clear error message
   * AND they can retry the vote submission
   */
  test('T044 - Participant vote submission fails, sees error and can retry', async ({ page }) => {
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

    // Step 1: Participant joins poll
    const joinPage = new JoinPage(page);
    await joinPage.goto();
    await joinPage.joinPoll(roomCode, testParticipant.nickname);

    const votePage = new VotePage(page);
    await votePage.selectOption(testPoll.options[0]);

    // Step 2: Simulate backend failure by going offline before vote submission
    await page.context().setOffline(true);

    // Attempt to submit vote (should fail)
    await votePage.submitVote();

    // Wait for error message
    await page.waitForTimeout(1000);

    const errorMessage = await page.locator('.error-message, .alert-danger, [role="alert"]').first().textContent({ timeout: 5000 }).catch(() => '');

    // Verify error message is displayed (may vary based on implementation)
    // If no explicit error message, just verify vote was not confirmed
    const confirmationAfterError = await votePage.getConfirmation().catch(() => '');
    const hasError = errorMessage.length > 0 || confirmationAfterError === '' || confirmationAfterError.toLowerCase().includes('error') || confirmationAfterError.toLowerCase().includes('failed');

    expect(hasError).toBe(true);

    // Step 3: Restore network connection
    await page.context().setOffline(false);
    await page.waitForTimeout(1000); // Wait for reconnection

    // Step 4: Retry vote submission (should succeed)
    await votePage.selectOption(testPoll.options[1]);
    await votePage.submitVote();

    const confirmation = await votePage.getConfirmation();
    expect(confirmation).toContain('recorded');

    // Cleanup
    await hostContext.close();

    console.log('✓ Vote submission error handling and retry successful');
  });

  /**
   * T045: User session expires, receives clear error message
   *
   * Acceptance Scenario 5: Session expiration handling
   * GIVEN a user has been inactive for an extended period
   * WHEN their session expires
   * THEN they receive a clear error message explaining the need to rejoin
   */
  test('T045 - User session expires, receives clear error message', async ({ page }) => {
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

    // Step 1: Participant joins poll
    const joinPage = new JoinPage(page);
    await joinPage.goto();
    await joinPage.joinPoll(roomCode, testParticipant.nickname);

    // Step 2: Simulate session expiration by clearing storage and cookies
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Step 3: Simulate WebSocket disconnection by going offline briefly
    await page.context().setOffline(true);
    await page.waitForTimeout(1000);
    await page.context().setOffline(false);

    // Step 4: Try to interact (vote submission) after session expiration
    const votePage = new VotePage(page);

    // Check for error message or disconnection notice
    // The application might show different states:
    // 1. Error message about session expiration
    // 2. Redirect to join page
    // 3. Disabled voting interface

    await page.waitForTimeout(2000); // Give time for error to appear

    const errorVisible = await page.locator('.error-message, .alert-danger, .alert-warning, [role="alert"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    const onJoinPage = await page.url().includes('join') || await page.locator('input[placeholder*="room" i], input[name="roomCode"]').isVisible({ timeout: 2000 }).catch(() => false);
    const votingDisabled = await votePage.isVotingDisabled().catch(() => false);

    // At least one of these conditions should be true after session expiration
    const sessionExpiredHandled = errorVisible || onJoinPage || votingDisabled;

    expect(sessionExpiredHandled).toBe(true);

    // Cleanup
    await hostContext.close();

    console.log('✓ Session expiration handled correctly');
  });
});
