const BasePage = require('./common/BasePage');

/**
 * VotePage - Page object for participant voting interface
 *
 * Provides methods to interact with the vote page UI including:
 * - Reading poll question and available options
 * - Selecting and submitting votes
 * - Changing votes while voting is open
 * - Checking voting status (enabled/disabled)
 * - Reading vote confirmation messages
 * - Viewing current vote selection
 */
class VotePage extends BasePage {
  // CSS Selectors (based on frontend/src/pages/VotePage.jsx)
  static POLL_QUESTION = '.poll-question h2';
  static ROOM_CODE_DISPLAY = '.room-info .room-code';
  static PARTICIPANT_NAME = '.participant-info .participant-name';
  static OPTION_BUTTON = '.option-button'; // All option buttons
  static SELECTED_OPTION_BUTTON = '.option-button.selected'; // Currently selected option
  static DISABLED_OPTION_BUTTON = '.option-button.disabled'; // Disabled options
  static CHANGE_VOTE_BUTTON = '.change-vote-button';
  static STATUS_MESSAGE = '.status-message'; // Waiting/closed messages
  static ERROR_MESSAGE = '.error-message';
  static VOTE_CONFIRMATION = '.vote-confirmation'; // VoteConfirmation component
  static CONNECTION_STATUS = '.connection-status';
  static RECONNECTING_BANNER = '.reconnecting-banner';

  /**
   * Get displayed poll question
   * @returns {Promise<string>} Poll question text
   */
  async getPollQuestion() {
    const questionElement = this.page.locator(VotePage.POLL_QUESTION).first();

    if (!(await questionElement.isVisible())) {
      throw new Error('Poll question element not found');
    }

    const question = await questionElement.textContent();
    console.log(`❓ Poll question: "${question.trim()}"`);
    return question.trim();
  }

  /**
   * Get list of available voting options
   * @returns {Promise<string[]>} Array of option texts
   */
  async getOptions() {
    const optionButtons = await this.page.locator(VotePage.OPTION_BUTTON).all();

    if (optionButtons.length === 0) {
      throw new Error('No voting options found');
    }

    const options = [];
    for (const button of optionButtons) {
      // Extract option text from button (look for .option-text span)
      const optionText = await button.locator('.option-text').textContent().catch(async () => {
        // Fallback: get all text content if .option-text doesn't exist
        return await button.textContent();
      });

      if (optionText) {
        // Clean up text (remove vote stats like "5 votes (50%)")
        const cleanText = optionText.split(/\d+\s*vote/).shift().trim();
        options.push(cleanText);
      }
    }

    console.log(`🗳️  Available options: ${options.join(', ')}`);
    return options;
  }

  /**
   * Select a voting option (does not submit automatically)
   * Note: In the actual implementation, clicking the option button submits immediately
   * @param {string} optionText - Text of option to select
   * @returns {Promise<void>}
   * @throws {Error} If option not found
   */
  async selectOption(optionText) {
    console.log(`🖱️  Selecting option: "${optionText}"`);

    const optionButtons = await this.page.locator(VotePage.OPTION_BUTTON).all();

    let found = false;
    for (const button of optionButtons) {
      const buttonText = await button.locator('.option-text').textContent().catch(async () => {
        return await button.textContent();
      });

      if (buttonText && buttonText.includes(optionText)) {
        await button.click();
        found = true;
        console.log(`✓ Selected option: "${optionText}"`);
        break;
      }
    }

    if (!found) {
      const availableOptions = await this.getOptions();
      throw new Error(
        `Option "${optionText}" not found. Available options: ${availableOptions.join(', ')}`
      );
    }

    // Wait a moment for vote submission to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Submit selected vote
   * Note: The actual UI submits votes immediately when clicking an option button
   * This method is a no-op but included for contract compliance
   * @returns {Promise<void>}
   */
  async submitVote() {
    // In the actual implementation, clicking the option button submits the vote
    // This method exists for contract compliance but doesn't need to do anything
    console.log('✓ Vote submitted (automatic on option click)');
  }

  /**
   * Get vote confirmation message
   * @returns {Promise<string|null>} Confirmation message or null if not shown
   */
  async getConfirmation() {
    const confirmationElement = this.page.locator(VotePage.VOTE_CONFIRMATION).first();
    const isVisible = await confirmationElement.isVisible().catch(() => false);

    if (isVisible) {
      const confirmationText = await confirmationElement.textContent();
      console.log(`✅ Confirmation: "${confirmationText.trim()}"`);
      return confirmationText.trim();
    }

    return null;
  }

  /**
   * Check if voting is disabled (poll not open)
   * @returns {Promise<boolean>} true if voting controls are disabled
   */
  async isVotingDisabled() {
    const disabledButtons = await this.page.locator(VotePage.DISABLED_OPTION_BUTTON).count();
    const totalButtons = await this.page.locator(VotePage.OPTION_BUTTON).count();

    // If all buttons are disabled, voting is disabled
    const disabled = disabledButtons === totalButtons && totalButtons > 0;

    console.log(`🔒 Voting disabled: ${disabled} (${disabledButtons}/${totalButtons} buttons disabled)`);
    return disabled;
  }

  /**
   * Get currently selected option
   * @returns {Promise<string|null>} Selected option text or null if none
   */
  async getCurrentVote() {
    const selectedButton = this.page.locator(VotePage.SELECTED_OPTION_BUTTON).first();
    const isVisible = await selectedButton.isVisible().catch(() => false);

    if (isVisible) {
      const optionText = await selectedButton.locator('.option-text').textContent().catch(async () => {
        return await selectedButton.textContent();
      });

      const cleanText = optionText.split(/\d+\s*vote/).shift().trim();
      console.log(`✓ Current vote: "${cleanText}"`);
      return cleanText;
    }

    console.log('ℹ️  No vote selected');
    return null;
  }

  /**
   * Change vote to different option and submit
   * @param {string} newOptionText - New option to vote for
   * @returns {Promise<void>}
   */
  async changeVote(newOptionText) {
    console.log(`🔄 Changing vote to: "${newOptionText}"`);

    // Check if "Change Your Vote" button is visible
    const changeButton = this.page.locator(VotePage.CHANGE_VOTE_BUTTON);
    const changeButtonVisible = await changeButton.isVisible().catch(() => false);

    if (changeButtonVisible) {
      // Click "Change Your Vote" to enable vote changing
      await changeButton.click();
      await this.page.waitForTimeout(300);
    }

    // Select the new option (this submits automatically)
    await this.selectOption(newOptionText);

    console.log(`✓ Vote changed to: "${newOptionText}"`);
  }

  /**
   * Get current poll state from status message
   * @returns {Promise<'waiting'|'open'|'closed'|null>} Poll state or null if not displayed
   */
  async getPollState() {
    const statusElement = this.page.locator(VotePage.STATUS_MESSAGE).first();
    const isVisible = await statusElement.isVisible().catch(() => false);

    if (isVisible) {
      const statusText = await statusElement.textContent();
      const lowerText = statusText.toLowerCase();

      if (lowerText.includes('waiting')) {
        return 'waiting';
      }
      if (lowerText.includes('closed')) {
        return 'closed';
      }
    }

    // If no status message, check if voting is disabled
    const votingDisabled = await this.isVotingDisabled();
    if (votingDisabled) {
      return 'closed';
    }

    // Otherwise assume voting is open
    return 'open';
  }

  /**
   * Wait for poll state to change
   * @param {string} expectedState - Expected state ('waiting', 'open', 'closed')
   * @param {number} timeout - Max wait time in ms (default: 10000)
   * @returns {Promise<void>}
   * @throws {Error} If state doesn't change within timeout
   */
  async waitForPollState(expectedState, timeout = 10000) {
    console.log(`⏳ Waiting for poll state: ${expectedState} (timeout: ${timeout}ms)`);

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const currentState = await this.getPollState();
      if (currentState === expectedState) {
        console.log(`✓ Poll state changed to: ${expectedState}`);
        return;
      }
      await this.page.waitForTimeout(200);
    }

    const currentState = await this.getPollState();
    throw new Error(
      `Poll state did not change to "${expectedState}" within ${timeout}ms. Current state: "${currentState}"`
    );
  }

  /**
   * Get error message if displayed
   * @returns {Promise<string|null>} Error message or null if no error
   */
  async getErrorMessage() {
    const errorElement = this.page.locator(VotePage.ERROR_MESSAGE).first();
    const isVisible = await errorElement.isVisible().catch(() => false);

    if (isVisible) {
      const errorText = await errorElement.textContent();
      return errorText.trim();
    }

    return null;
  }

  /**
   * Check connection status
   * @returns {Promise<'connected'|'disconnected'|'failed'>} Connection status
   */
  async getConnectionStatus() {
    const statusElement = this.page.locator(VotePage.CONNECTION_STATUS).first();
    const isVisible = await statusElement.isVisible().catch(() => false);

    if (isVisible) {
      const statusText = await statusElement.textContent();
      const lowerText = statusText.toLowerCase();

      if (lowerText.includes('disconnected')) {
        return 'disconnected';
      }
      if (lowerText.includes('failed')) {
        return 'failed';
      }
      return 'connected';
    }

    return 'connected'; // Default assumption
  }

  /**
   * Check if reconnecting banner is displayed
   * @returns {Promise<boolean>} true if reconnecting
   */
  async isReconnecting() {
    const banner = this.page.locator(VotePage.RECONNECTING_BANNER);
    return await banner.isVisible().catch(() => false);
  }

  /**
   * Get room code displayed on page
   * @returns {Promise<string>} Room code
   */
  async getRoomCode() {
    const roomCodeElement = this.page.locator(VotePage.ROOM_CODE_DISPLAY).first();
    const roomCode = await roomCodeElement.textContent();
    return roomCode.trim();
  }

  /**
   * Get participant nickname displayed on page
   * @returns {Promise<string>} Participant nickname
   */
  async getNickname() {
    const nicknameElement = this.page.locator(VotePage.PARTICIPANT_NAME).first();
    const nickname = await nicknameElement.textContent();
    return nickname.trim();
  }
}

module.exports = VotePage;
