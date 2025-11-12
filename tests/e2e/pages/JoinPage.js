const BasePage = require('./common/BasePage');

/**
 * JoinPage - Page object for participant poll joining
 *
 * Provides methods to interact with the join page UI including:
 * - Filling and submitting join form with room code and nickname
 * - Checking for error messages after failed join attempts
 * - Verifying successful join (redirect to vote page)
 */
class JoinPage extends BasePage {
  // CSS Selectors (based on frontend/src/pages/JoinPage.jsx)
  static ROOM_CODE_INPUT = '#join-room-code';
  static NICKNAME_INPUT = '#join-nickname';
  static JOIN_BUTTON = 'button[type="submit"]'; // "Join Poll" button
  static ERROR_MESSAGE = '.error-message';
  static JOIN_FORM = '.join-form';

  /**
   * Fill and submit join form to join a poll
   * @param {string} roomCode - 6-character room code
   * @param {string} nickname - Participant nickname (1-20 chars)
   * @returns {Promise<void>}
   * @throws {Error} If validation fails or join doesn't complete
   */
  async joinPoll(roomCode, nickname) {
    if (!roomCode || roomCode.length !== 6) {
      throw new Error(`Invalid room code: "${roomCode}" (must be 6 characters)`);
    }

    if (!nickname || nickname.length < 1 || nickname.length > 20) {
      throw new Error(`Invalid nickname: "${nickname}" (must be 1-20 characters)`);
    }

    console.log(`🚪 Joining poll ${roomCode} as "${nickname}"`);

    // Fill room code
    await this.fill(JoinPage.ROOM_CODE_INPUT, roomCode);

    // Fill nickname
    await this.fill(JoinPage.NICKNAME_INPUT, nickname);

    // Submit form
    await this.click(JoinPage.JOIN_BUTTON);

    // Wait for either:
    // 1. Navigation to vote page (success)
    // 2. Error message appears (failure)
    try {
      await Promise.race([
        // Wait for URL to change to /vote/{roomCode} (success)
        this.page.waitForURL(/\/vote\/[A-Z0-9]{6}/, { timeout: 5000 }),
        // Or wait for error message to appear (failure)
        this.waitForSelector(JoinPage.ERROR_MESSAGE, { timeout: 5000 }),
      ]);

      const currentUrl = this.page.url();
      if (currentUrl.includes('/vote/')) {
        console.log(`✓ Successfully joined poll ${roomCode}`);
      } else {
        const errorMsg = await this.getErrorMessage();
        console.log(`✗ Join failed: ${errorMsg}`);
      }
    } catch (error) {
      throw new Error(`Join poll timed out: ${error.message}`);
    }
  }

  /**
   * Extract error message displayed after failed join attempt
   * @returns {Promise<string|null>} Error message or null if no error
   */
  async getErrorMessage() {
    const errorElement = this.page.locator(JoinPage.ERROR_MESSAGE).first();
    const isVisible = await errorElement.isVisible().catch(() => false);

    if (isVisible) {
      const errorText = await errorElement.textContent();
      return errorText.trim();
    }

    return null;
  }

  /**
   * Check if join was successful (redirected to vote page)
   * @returns {Promise<boolean>} true if on vote page, false otherwise
   */
  async isJoinSuccessful() {
    const currentUrl = this.page.url();
    const onVotePage = /\/vote\/[A-Z0-9]{6}/.test(currentUrl);

    console.log(`🔍 Join successful: ${onVotePage} (URL: ${currentUrl})`);
    return onVotePage;
  }

  /**
   * Verify join page is displayed correctly
   * @returns {Promise<boolean>} true if all key elements are present
   */
  async isLoaded() {
    const formVisible = await this.page.locator(JoinPage.JOIN_FORM).isVisible().catch(() => false);
    const roomCodeInputVisible = await this.page.locator(JoinPage.ROOM_CODE_INPUT).isVisible().catch(() => false);
    const nicknameInputVisible = await this.page.locator(JoinPage.NICKNAME_INPUT).isVisible().catch(() => false);
    const joinButtonVisible = await this.page.locator(JoinPage.JOIN_BUTTON).isVisible().catch(() => false);

    const loaded = formVisible && roomCodeInputVisible && nicknameInputVisible && joinButtonVisible;

    if (!loaded) {
      console.warn('⚠ Join page not fully loaded:', {
        formVisible,
        roomCodeInputVisible,
        nicknameInputVisible,
        joinButtonVisible,
      });
    }

    return loaded;
  }

  /**
   * Get current form values (useful for debugging)
   * @returns {Promise<{roomCode: string, nickname: string}>} Current form values
   */
  async getFormValues() {
    const roomCodeValue = await this.page.inputValue(JoinPage.ROOM_CODE_INPUT).catch(() => '');
    const nicknameValue = await this.page.inputValue(JoinPage.NICKNAME_INPUT).catch(() => '');

    return {
      roomCode: roomCodeValue,
      nickname: nicknameValue,
    };
  }

  /**
   * Check if join button is enabled
   * @returns {Promise<boolean>} true if button is enabled
   */
  async isJoinButtonEnabled() {
    const button = this.page.locator(JoinPage.JOIN_BUTTON);
    const isDisabled = await button.isDisabled().catch(() => true);
    return !isDisabled;
  }

  /**
   * Wait for join to complete (either success or error)
   * @param {number} timeout - Max wait time in ms (default: 5000)
   * @returns {Promise<{success: boolean, error: string|null}>}
   */
  async waitForJoinResult(timeout = 5000) {
    try {
      await Promise.race([
        this.page.waitForURL(/\/vote\/[A-Z0-9]{6}/, { timeout }),
        this.waitForSelector(JoinPage.ERROR_MESSAGE, { timeout }),
      ]);

      const success = await this.isJoinSuccessful();
      const error = success ? null : await this.getErrorMessage();

      return { success, error };
    } catch (error) {
      throw new Error(`Waiting for join result timed out after ${timeout}ms`);
    }
  }
}

module.exports = JoinPage;
