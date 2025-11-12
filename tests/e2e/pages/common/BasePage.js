/**
 * BasePage - Base class for all page objects
 *
 * Provides common functionality for page interactions including
 * navigation, waiting, screenshots, and element queries.
 *
 * All page objects should extend this class to inherit base functionality.
 */
class BasePage {
  /**
   * Create a new BasePage instance
   * @param {import('@playwright/test').Page} page - Playwright page instance
   * @param {string} baseUrl - Application base URL
   */
  constructor(page, baseUrl) {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  /**
   * Navigate to a specific path within the application
   * @param {string} path - Path relative to baseUrl (default: '/')
   * @returns {Promise<void>}
   */
  async goto(path = '/') {
    const url = `${this.baseUrl}${path}`;
    await this.page.goto(url);
  }

  /**
   * Wait for page to fully load (DOM content loaded + network idle)
   * @param {number} timeout - Maximum wait time in ms (default: 30000)
   * @returns {Promise<void>}
   * @throws {Error} If page doesn't load within timeout
   */
  async waitForLoad(timeout = 30000) {
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout });
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch (error) {
      throw new Error(`Page failed to load within ${timeout}ms: ${error.message}`);
    }
  }

  /**
   * Get current page title
   * @returns {Promise<string>} Page title
   */
  async getTitle() {
    return await this.page.title();
  }

  /**
   * Capture screenshot of current page
   * @param {string} name - Screenshot filename (without extension)
   * @returns {Promise<Buffer>} Screenshot data
   */
  async screenshot(name) {
    const path = `tests/e2e/reports/screenshots/${name}.png`;
    const buffer = await this.page.screenshot({ path, fullPage: true });
    console.log(`📸 Screenshot saved: ${path}`);
    return buffer;
  }

  /**
   * Wait for element to appear
   * @param {string} selector - CSS selector
   * @param {object} options - Playwright wait options
   * @param {number} options.timeout - Max wait time in ms
   * @param {'attached'|'detached'|'visible'|'hidden'} options.state - Element state to wait for
   * @returns {Promise<import('@playwright/test').ElementHandle>}
   * @throws {Error} If element doesn't appear within timeout
   */
  async waitForSelector(selector, options = {}) {
    const defaultOptions = {
      timeout: 30000,
      state: 'visible',
    };
    const mergedOptions = { ...defaultOptions, ...options };

    try {
      return await this.page.waitForSelector(selector, mergedOptions);
    } catch (error) {
      throw new Error(
        `Element not found: ${selector} (state: ${mergedOptions.state}, timeout: ${mergedOptions.timeout}ms)`
      );
    }
  }

  /**
   * Check if element exists on page
   * @param {string} selector - CSS selector
   * @returns {Promise<boolean>} True if element exists
   */
  async elementExists(selector) {
    const element = await this.page.$(selector);
    return element !== null;
  }

  /**
   * Get text content of element
   * @param {string} selector - CSS selector
   * @returns {Promise<string>} Text content
   * @throws {Error} If element not found
   */
  async getText(selector) {
    const element = await this.page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    const text = await element.textContent();
    return text ? text.trim() : '';
  }

  /**
   * Click element
   * @param {string} selector - CSS selector
   * @param {object} options - Click options
   * @returns {Promise<void>}
   * @throws {Error} If element not found or not clickable
   */
  async click(selector, options = {}) {
    try {
      await this.page.click(selector, options);
    } catch (error) {
      throw new Error(`Failed to click ${selector}: ${error.message}`);
    }
  }

  /**
   * Fill input field
   * @param {string} selector - CSS selector
   * @param {string} value - Value to fill
   * @returns {Promise<void>}
   * @throws {Error} If input not found
   */
  async fill(selector, value) {
    try {
      await this.page.fill(selector, value);
    } catch (error) {
      throw new Error(`Failed to fill ${selector}: ${error.message}`);
    }
  }

  /**
   * Select option from dropdown
   * @param {string} selector - CSS selector for select element
   * @param {string} value - Option value to select
   * @returns {Promise<void>}
   * @throws {Error} If select not found or option invalid
   */
  async selectOption(selector, value) {
    try {
      await this.page.selectOption(selector, value);
    } catch (error) {
      throw new Error(`Failed to select option ${value} in ${selector}: ${error.message}`);
    }
  }

  /**
   * Get current URL
   * @returns {string} Current page URL
   */
  getCurrentUrl() {
    return this.page.url();
  }

  /**
   * Reload current page
   * @returns {Promise<void>}
   */
  async reload() {
    await this.page.reload();
  }

  /**
   * Go back in browser history
   * @returns {Promise<void>}
   */
  async goBack() {
    await this.page.goBack();
  }

  /**
   * Wait for navigation to complete
   * @param {number} timeout - Max wait time in ms
   * @returns {Promise<void>}
   */
  async waitForNavigation(timeout = 30000) {
    await this.page.waitForNavigation({ timeout });
  }

  /**
   * Evaluate JavaScript in page context
   * @param {Function|string} pageFunction - Function to execute
   * @param {any} args - Arguments to pass to function
   * @returns {Promise<any>} Function return value
   */
  async evaluate(pageFunction, ...args) {
    return await this.page.evaluate(pageFunction, ...args);
  }
}

module.exports = BasePage;
