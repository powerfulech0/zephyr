const { test, expect } = require('@playwright/test');
const HostDashboardPage = require('../pages/HostDashboardPage');
const JoinPage = require('../pages/JoinPage');
const VotePage = require('../pages/VotePage');
const { generatePoll, generateParticipant } = require('../fixtures/pollData');
const { getConfig } = require('../config/test-env');
const {
  captureSocketEvents,
  waitForSocketEvent,
} = require('../helpers/websocketHelpers');

/**
 * User Story 2: Complete Participant Vote Journey Testing (Priority: P2)
 *
 * Goal: Automate participant experience from joining poll through vote submission
 * to ensure seamless audience participation.
 *
 * Test Scenarios:
 * 1. Participant joins poll with valid room code and nickname
 * 2. Participant submits vote and receives instant confirmation
 * 3. Participant changes vote while voting is open
 * 4. Participant attempts join with invalid room code (error handling)
 * 5. Participant attempts join with duplicate nickname (error handling)
 * 6. Host closes voting, participant interface updates to disable voting
 */

test.describe('Participant Vote Journey (User Story 2)', () => {
  let config;
  let hostPage;
  let joinPage;
  let votePage;

  test.beforeEach(async ({ page, context }) => {
    config = getConfig();
  });

  /**
   * T024 - Acceptance Scenario 1
   * Given: Host has created a poll and opened voting
   * When: Participant navigates to /join and enters valid room code and nickname
   * And: Participant submits join form
   * Then: Participant is redirected to /vote/{roomCode}
   * And: Poll question and options are displayed
   * And: Participant can see all voting options
   */
  test('T024: Participant joins poll with valid room code and nickname', async ({ page, browser }) => {
    console.log('🧪 T024: Testing participant join with valid credentials');

    // Setup: Create poll as host in separate context
    const hostContext = await browser.newContext();
    const hostPageInstance = await hostContext.newPage();
    hostPage = new HostDashboardPage(hostPageInstance, config.baseUrl);

    await hostPage.goto('/host');
    await hostPage.waitForLoad();

    const pollData = generatePoll({
      question: 'Best programming language for web development?',
      options: ['JavaScript', 'TypeScript', 'Python'],
    });

    await hostPage.createPoll(pollData.question, pollData.options);
    const roomCode = await hostPage.getRoomCode();
    await hostPage.openVoting();

    console.log(`📋 Poll created with room code: ${roomCode}`);

    // Test: Join as participant
    joinPage = new JoinPage(page, config.baseUrl);
    await joinPage.goto('/join');
    await joinPage.waitForLoad();

    const participantData = generateParticipant({ roomCode });
    await joinPage.joinPoll(roomCode, participantData.nickname);

    // Verify successful join (redirected to vote page)
    const joinSuccessful = await joinPage.isJoinSuccessful();
    expect(joinSuccessful).toBe(true);

    // Verify vote page displays poll data
    votePage = new VotePage(page, config.baseUrl);
    const question = await votePage.getPollQuestion();
    expect(question).toBe(pollData.question);

    const options = await votePage.getOptions();
    expect(options).toEqual(pollData.options);

    // Verify participant info displayed
    const displayedRoomCode = await votePage.getRoomCode();
    expect(displayedRoomCode).toBe(roomCode);

    const displayedNickname = await votePage.getNickname();
    expect(displayedNickname).toBe(participantData.nickname);

    console.log('✓ T024: Participant successfully joined poll');

    // Cleanup
    await hostContext.close();
  });

  /**
   * T025 - Acceptance Scenario 2
   * Given: Participant has joined poll and voting is open
   * When: Participant selects an option and submits vote
   * Then: Vote is submitted successfully
   * And: Confirmation message is displayed
   * And: Vote is recorded (visible in results if shown)
   */
  test('T025: Participant submits vote and receives instant confirmation', async ({ page, browser }) => {
    console.log('🧪 T025: Testing vote submission and confirmation');

    // Setup: Create poll as host
    const hostContext = await browser.newContext();
    const hostPageInstance = await hostContext.newPage();
    hostPage = new HostDashboardPage(hostPageInstance, config.baseUrl);

    await hostPage.goto('/host');
    await hostPage.waitForLoad();

    const pollData = generatePoll({
      question: 'Favorite JavaScript framework?',
      options: ['React', 'Vue', 'Angular', 'Svelte'],
    });

    await hostPage.createPoll(pollData.question, pollData.options);
    const roomCode = await hostPage.getRoomCode();
    await hostPage.openVoting();

    // Join as participant
    joinPage = new JoinPage(page, config.baseUrl);
    await joinPage.goto('/join');
    const participantData = generateParticipant({ roomCode });
    await joinPage.joinPoll(roomCode, participantData.nickname);

    // Vote page setup
    votePage = new VotePage(page, config.baseUrl);

    // Start capturing WebSocket events for vote confirmation
    await captureSocketEvents(page, ['vote-update']);

    // Submit vote for first option
    const selectedOption = pollData.options[0];
    await votePage.selectOption(selectedOption);

    // Verify vote was submitted (confirmation shown)
    const confirmation = await votePage.getConfirmation();
    expect(confirmation).toBeTruthy();

    // Verify current vote is recorded
    const currentVote = await votePage.getCurrentVote();
    expect(currentVote).toBe(selectedOption);

    console.log(`✓ T025: Vote submitted for "${selectedOption}" with confirmation`);

    // Cleanup
    await hostContext.close();
  });

  /**
   * T026 - Acceptance Scenario 3
   * Given: Participant has already voted
   * And: Voting is still open
   * When: Participant clicks "Change Your Vote" and selects different option
   * Then: Previous vote is replaced with new vote
   * And: Confirmation message is displayed for vote change
   * And: Only one vote is counted per participant
   */
  test('T026: Participant changes vote while voting open', async ({ page, browser }) => {
    console.log('🧪 T026: Testing vote change functionality');

    // Setup: Create poll as host
    const hostContext = await browser.newContext();
    const hostPageInstance = await hostContext.newPage();
    hostPage = new HostDashboardPage(hostPageInstance, config.baseUrl);

    await hostPage.goto('/host');
    await hostPage.waitForLoad();

    const pollData = generatePoll({
      question: 'Best time to code?',
      options: ['Morning', 'Afternoon', 'Evening', 'Night'],
    });

    await hostPage.createPoll(pollData.question, pollData.options);
    const roomCode = await hostPage.getRoomCode();
    await hostPage.openVoting();

    // Join as participant
    joinPage = new JoinPage(page, config.baseUrl);
    await joinPage.goto('/join');
    const participantData = generateParticipant({ roomCode });
    await joinPage.joinPoll(roomCode, participantData.nickname);

    // Vote page setup
    votePage = new VotePage(page, config.baseUrl);

    // Submit initial vote
    const firstChoice = pollData.options[0];
    await votePage.selectOption(firstChoice);

    let currentVote = await votePage.getCurrentVote();
    expect(currentVote).toBe(firstChoice);

    // Change vote to different option
    const secondChoice = pollData.options[2];
    await votePage.changeVote(secondChoice);

    // Verify vote changed
    currentVote = await votePage.getCurrentVote();
    expect(currentVote).toBe(secondChoice);

    // Verify confirmation shown
    const confirmation = await votePage.getConfirmation();
    expect(confirmation).toBeTruthy();

    console.log(`✓ T026: Vote changed from "${firstChoice}" to "${secondChoice}"`);

    // Cleanup
    await hostContext.close();
  });

  /**
   * T027 - Acceptance Scenario 4
   * Given: Participant is on /join page
   * When: Participant enters invalid room code (not existing) and nickname
   * And: Participant submits join form
   * Then: Error message is displayed: "Poll not found"
   * And: Participant remains on join page
   * And: No navigation to vote page occurs
   */
  test('T027: Participant attempts join with invalid room code', async ({ page }) => {
    console.log('🧪 T027: Testing join with invalid room code');

    joinPage = new JoinPage(page, config.baseUrl);
    await joinPage.goto('/join');
    await joinPage.waitForLoad();

    const participantData = generateParticipant();
    const invalidRoomCode = 'XXXXXX'; // Non-existent room code

    // Attempt to join with invalid room code
    await joinPage.joinPoll(invalidRoomCode, participantData.nickname);

    // Verify error message displayed
    const errorMessage = await joinPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.toLowerCase()).toContain('not found');

    // Verify still on join page (not redirected)
    const joinSuccessful = await joinPage.isJoinSuccessful();
    expect(joinSuccessful).toBe(false);

    console.log(`✓ T027: Invalid room code rejected with error: "${errorMessage}"`);
  });

  /**
   * T028 - Acceptance Scenario 5
   * Given: Host has created a poll
   * And: Participant "Alice" has already joined
   * When: Another participant attempts to join with same nickname "Alice"
   * Then: Error message is displayed requesting different nickname
   * And: Second participant cannot join with duplicate nickname
   */
  test('T028: Participant attempts join with duplicate nickname', async ({ page, browser }) => {
    console.log('🧪 T028: Testing join with duplicate nickname');

    // Setup: Create poll as host
    const hostContext = await browser.newContext();
    const hostPageInstance = await hostContext.newPage();
    hostPage = new HostDashboardPage(hostPageInstance, config.baseUrl);

    await hostPage.goto('/host');
    await hostPage.waitForLoad();

    const pollData = generatePoll({
      question: 'Favorite color?',
      options: ['Red', 'Blue', 'Green'],
    });

    await hostPage.createPoll(pollData.question, pollData.options);
    const roomCode = await hostPage.getRoomCode();
    await hostPage.openVoting();

    // First participant joins successfully
    const participant1Context = await browser.newContext();
    const participant1Page = await participant1Context.newPage();
    const joinPage1 = new JoinPage(participant1Page, config.baseUrl);

    await joinPage1.goto('/join');
    const duplicateNickname = 'Alice';
    await joinPage1.joinPoll(roomCode, duplicateNickname);

    const join1Successful = await joinPage1.isJoinSuccessful();
    expect(join1Successful).toBe(true);

    console.log(`✓ First participant "${duplicateNickname}" joined successfully`);

    // Second participant attempts to join with same nickname
    joinPage = new JoinPage(page, config.baseUrl);
    await joinPage.goto('/join');

    await joinPage.joinPoll(roomCode, duplicateNickname);

    // Verify error message about duplicate nickname
    const errorMessage = await joinPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
    expect(errorMessage.toLowerCase()).toMatch(/nickname|already|taken|exists/);

    // Verify second participant not redirected
    const join2Successful = await joinPage.isJoinSuccessful();
    expect(join2Successful).toBe(false);

    console.log(`✓ T028: Duplicate nickname rejected with error: "${errorMessage}"`);

    // Cleanup
    await participant1Context.close();
    await hostContext.close();
  });

  /**
   * T029 - Acceptance Scenario 6
   * Given: Participant has joined poll and is on vote page
   * And: Voting is currently open
   * When: Host closes voting
   * Then: Participant interface updates in real-time
   * And: Vote submission controls are disabled
   * And: Participant sees "Voting has been closed" message
   * And: poll-state-changed WebSocket event is received
   */
  test('T029: Host closes voting, participant interface disables voting', async ({ page, browser }) => {
    console.log('🧪 T029: Testing real-time voting closure for participants');

    // Setup: Create poll as host
    const hostContext = await browser.newContext();
    const hostPageInstance = await hostContext.newPage();
    hostPage = new HostDashboardPage(hostPageInstance, config.baseUrl);

    await hostPage.goto('/host');
    await hostPage.waitForLoad();

    const pollData = generatePoll({
      question: 'Favorite season?',
      options: ['Spring', 'Summer', 'Fall', 'Winter'],
    });

    await hostPage.createPoll(pollData.question, pollData.options);
    const roomCode = await hostPage.getRoomCode();
    await hostPage.openVoting();

    // Join as participant
    joinPage = new JoinPage(page, config.baseUrl);
    await joinPage.goto('/join');
    const participantData = generateParticipant({ roomCode });
    await joinPage.joinPoll(roomCode, participantData.nickname);

    // Vote page setup
    votePage = new VotePage(page, config.baseUrl);

    // Verify voting is initially enabled
    let votingDisabled = await votePage.isVotingDisabled();
    expect(votingDisabled).toBe(false);

    let pollState = await votePage.getPollState();
    expect(pollState).toBe('open');

    // Start capturing WebSocket events
    await captureSocketEvents(page, ['poll-state-changed']);

    // Host closes voting
    await hostPage.closeVoting();

    // Wait for poll-state-changed event on participant page
    const stateChangeEvent = await waitForSocketEvent(page, 'poll-state-changed', {
      timeout: 3000,
      dataMatch: { newState: 'closed' },
    });

    expect(stateChangeEvent.data.newState).toBe('closed');

    // Verify participant UI updated
    await votePage.waitForPollState('closed', 3000);

    pollState = await votePage.getPollState();
    expect(pollState).toBe('closed');

    // Verify voting controls disabled
    votingDisabled = await votePage.isVotingDisabled();
    expect(votingDisabled).toBe(true);

    console.log('✓ T029: Participant interface disabled when host closed voting');

    // Cleanup
    await hostContext.close();
  });
});

/**
 * Test Suite Summary
 *
 * Coverage:
 * ✅ T024: Participant join with valid credentials
 * ✅ T025: Vote submission with confirmation
 * ✅ T026: Vote change functionality
 * ✅ T027: Invalid room code error handling
 * ✅ T028: Duplicate nickname error handling
 * ✅ T029: Real-time voting closure
 *
 * Next Steps:
 * - Run tests to identify selector issues (T030)
 * - Refine JoinPage and VotePage selectors (T030)
 * - Add additional WebSocket validation (T031)
 * - Verify all tests pass (T032)
 */
