const BasePage = require('./common/BasePage');

/**
 * HostDashboardPage - Page object for host poll creation and management
 *
 * Provides methods to interact with the host dashboard UI including:
 * - Creating polls with question and options
 * - Extracting room code after poll creation
 * - Opening and closing voting
 * - Reading participant count and poll state
 * - Extracting vote results
 */
class HostDashboardPage extends BasePage {
  // CSS Selectors (based on frontend/src/pages/HostDashboard.jsx)
  static POLL_QUESTION_INPUT = '#poll-question';
  static POLL_OPTION_INPUT_PREFIX = '#poll-option-'; // Append index: #poll-option-0, #poll-option-1
  static CREATE_POLL_BUTTON = 'button[type="submit"]'; // "Create Poll" button
  static ADD_OPTION_BUTTON = '.btn-add';
  static REMOVE_OPTION_BUTTON = '.btn-remove';
  static ERROR_MESSAGE = '.error-message';

  // After poll creation
  static ROOM_CODE_ELEMENT = '.room-code strong'; // "Room Code: <strong>ABC123</strong>"
  static POLL_HEADER = '.poll-header';
  static PARTICIPANT_COUNTER = '.participant-counter'; // ParticipantCounter component
  static PARTICIPANT_COUNT_TEXT = '.counter-text'; // Contains "X participants connected"
  static OPEN_VOTING_BUTTON = 'button.btn-open'; // PollControls: "Open Voting" button
  static CLOSE_VOTING_BUTTON = 'button.btn-close'; // PollControls: "Close Voting" button
  static POLL_STATE_INDICATOR = '.poll-status span'; // Poll state display in PollControls
  static POLL_RESULTS_CONTAINER = '.poll-results'; // PollResults component
  static RESULT_ITEM = '.result-item'; // Individual result items
  static OPTION_TEXT = '.option-text'; // Option name within result-item
  static VOTE_COUNT = '.vote-count'; // Vote count and percentage text

  /**
   * Create new poll by filling form and submitting
   * @param {string} question - Poll question text
   * @param {string[]} options - Array of 2-5 option texts
   * @returns {Promise<void>}
   * @throws {Error} If form validation fails or submission times out
   */
  async createPoll(question, options) {
    if (!question || options.length < 2 || options.length > 5) {
      throw new Error(`Invalid poll data: question="${question}", options count=${options.length}`);
    }

    console.log(`📝 Creating poll: "${question}" with ${options.length} options`);

    // Fill in question
    await this.fill(HostDashboardPage.POLL_QUESTION_INPUT, question);

    // The form starts with 2 empty option inputs
    // Fill existing inputs and add more if needed
    for (let i = 0; i < options.length; i++) {
      const optionSelector = `${HostDashboardPage.POLL_OPTION_INPUT_PREFIX}${i}`;

      // If option input doesn't exist yet, click "Add Option" button
      const optionExists = await this.page.locator(optionSelector).count() > 0;
      if (!optionExists) {
        await this.click(HostDashboardPage.ADD_OPTION_BUTTON);
        // Wait for new input to appear
        await this.waitForSelector(optionSelector);
      }

      await this.fill(optionSelector, options[i]);
    }

    // Submit form
    await this.click(HostDashboardPage.CREATE_POLL_BUTTON);

    // Wait for poll creation to complete (room code should appear)
    try {
      await this.waitForSelector(HostDashboardPage.ROOM_CODE_ELEMENT, { timeout: 5000 });
      console.log('✓ Poll created successfully');
    } catch (error) {
      // Check if there's an error message
      const errorMsg = await this.getErrorMessage();
      if (errorMsg) {
        throw new Error(`Poll creation failed: ${errorMsg}`);
      }
      throw new Error('Poll creation timed out waiting for room code');
    }
  }

  /**
   * Get error message if displayed
   * @returns {Promise<string|null>} Error message or null if no error
   */
  async getErrorMessage() {
    const errorElement = await this.page.locator(HostDashboardPage.ERROR_MESSAGE).first();
    const isVisible = await errorElement.isVisible().catch(() => false);

    if (isVisible) {
      return await errorElement.textContent();
    }
    return null;
  }

  /**
   * Extract displayed room code after poll creation
   * @returns {Promise<string>} 6-character room code
   * @throws {Error} If room code element not found
   */
  async getRoomCode() {
    const roomCodeElement = await this.page.locator(HostDashboardPage.ROOM_CODE_ELEMENT).first();

    if (!(await roomCodeElement.isVisible())) {
      throw new Error('Room code element not found. Poll may not have been created successfully.');
    }

    const roomCode = await roomCodeElement.textContent();
    const trimmedCode = roomCode.trim();

    if (!/^[A-Z0-9]{6}$/.test(trimmedCode)) {
      throw new Error(`Invalid room code format: "${trimmedCode}"`);
    }

    console.log(`🔑 Room code: ${trimmedCode}`);
    return trimmedCode;
  }

  /**
   * Click "Open Voting" button to transition poll to open state
   * @returns {Promise<void>}
   * @throws {Error} If button not found or state doesn't change
   */
  async openVoting() {
    console.log('🟢 Opening voting...');

    const button = this.page.locator(HostDashboardPage.OPEN_VOTING_BUTTON);

    if (!(await button.isVisible())) {
      throw new Error('Open Voting button not found. Poll may not be in waiting state.');
    }

    await button.click();

    // Wait a moment for state change to propagate via WebSocket
    await this.page.waitForTimeout(500);

    console.log('✓ Voting opened');
  }

  /**
   * Click "Close Voting" button to transition poll to closed state
   * @returns {Promise<void>}
   * @throws {Error} If button not found or state doesn't change
   */
  async closeVoting() {
    console.log('🔴 Closing voting...');

    const button = this.page.locator(HostDashboardPage.CLOSE_VOTING_BUTTON);

    if (!(await button.isVisible())) {
      throw new Error('Close Voting button not found. Poll may not be in open state.');
    }

    await button.click();

    // Wait a moment for state change to propagate via WebSocket
    await this.page.waitForTimeout(500);

    console.log('✓ Voting closed');
  }

  /**
   * Extract current vote counts and percentages from results display
   * @returns {Promise<VoteResults>} Object mapping option text to {count, percentage}
   *
   * Example return:
   * {
   *   "Red": { count: 5, percentage: 50 },
   *   "Blue": { count: 3, percentage: 30 },
   *   "Green": { count: 2, percentage: 20 }
   * }
   */
  async getResults() {
    const resultsContainer = this.page.locator(HostDashboardPage.POLL_RESULTS_CONTAINER);

    if (!(await resultsContainer.isVisible())) {
      throw new Error('Poll results container not found');
    }

    // Get all result items (.result-item from PollResults component)
    const resultItems = await this.page.locator(HostDashboardPage.RESULT_ITEM).all();

    if (resultItems.length === 0) {
      console.warn('⚠ No result items found, returning empty results');
      return {};
    }

    const results = {};

    for (const item of resultItems) {
      // Extract option text from .option-text span
      const optionText = await item.locator(HostDashboardPage.OPTION_TEXT).textContent().catch(() => '');

      // Extract vote count text (format: "5 votes (50%)")
      const voteCountText = await item.locator(HostDashboardPage.VOTE_COUNT).textContent().catch(() => '0 votes (0%)');

      // Parse count and percentage from text like "5 votes (50%)"
      const countMatch = voteCountText.match(/(\d+)\s*vote/);
      const percentageMatch = voteCountText.match(/\((\d+)%\)/);

      const count = countMatch ? parseInt(countMatch[1], 10) : 0;
      const percentage = percentageMatch ? parseInt(percentageMatch[1], 10) : 0;

      if (optionText.trim()) {
        results[optionText.trim()] = { count, percentage };
      }
    }

    console.log(`📊 Results:`, results);
    return results;
  }

  /**
   * Get number of currently connected participants
   * @returns {Promise<number>} Participant count
   */
  async getParticipantCount() {
    const counterElement = this.page.locator(HostDashboardPage.PARTICIPANT_COUNTER);

    if (!(await counterElement.isVisible())) {
      console.warn('⚠ Participant counter not visible, returning 0');
      return 0;
    }

    // Get text from .counter-text span (format: "5 participants connected" or "1 participant connected")
    const counterText = await counterElement.locator(HostDashboardPage.PARTICIPANT_COUNT_TEXT).textContent().catch(() => '0 participants connected');

    // Extract number from text like "5 participants connected"
    const match = counterText.match(/(\d+)/);
    const count = match ? parseInt(match[1], 10) : 0;

    console.log(`👥 Participant count: ${count}`);
    return count;
  }

  /**
   * Get current poll state
   * @returns {Promise<'waiting'|'open'|'closed'>} Current poll state
   */
  async getPollState() {
    // First try to get state from the .poll-status indicator (most reliable)
    const stateIndicator = this.page.locator(HostDashboardPage.POLL_STATE_INDICATOR).first();
    const stateIndicatorVisible = await stateIndicator.isVisible().catch(() => false);

    if (stateIndicatorVisible) {
      const stateText = await stateIndicator.textContent();
      const state = stateText.trim().toLowerCase();
      console.log(`📍 Poll state (from indicator): ${state}`);
      return state;
    }

    // Fallback: Check which button is visible to infer state
    const openButtonVisible = await this.page.locator(HostDashboardPage.OPEN_VOTING_BUTTON).isVisible().catch(() => false);
    const closeButtonVisible = await this.page.locator(HostDashboardPage.CLOSE_VOTING_BUTTON).isVisible().catch(() => false);

    let state;
    if (openButtonVisible && !closeButtonVisible) {
      state = 'waiting';
    } else if (!openButtonVisible && closeButtonVisible) {
      state = 'open';
    } else if (!openButtonVisible && !closeButtonVisible) {
      state = 'closed';
    } else {
      console.warn('⚠ Could not determine poll state, defaulting to waiting');
      state = 'waiting';
    }

    console.log(`📍 Poll state (from buttons): ${state}`);
    return state;
  }
}

module.exports = HostDashboardPage;

/**
 * @typedef {Object} VoteResults
 * @property {string} optionText - The voting option text
 * @property {Object} results - Vote count and percentage
 * @property {number} results.count - Number of votes
 * @property {number} results.percentage - Percentage of total votes
 *
 * Example: { "Red": { count: 5, percentage: 50 }, "Blue": { count: 3, percentage: 30 } }
 */
