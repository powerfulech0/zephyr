/**
 * WebSocket Testing Helpers
 *
 * Functions to capture, wait for, and assert on WebSocket events
 * during E2E tests. Essential for validating real-time features.
 */

/**
 * Start capturing WebSocket events of specific types
 * @param {import('@playwright/test').Page} page - Playwright page instance
 * @param {string[]} eventTypes - Array of Socket.io event types to capture (empty = capture all)
 * @returns {Promise<void>}
 */
async function captureSocketEvents(page, eventTypes = []) {
  await page.evaluate((types) => {
    // Initialize storage for captured events
    window.socketEvents = window.socketEvents || [];

    // Find the socket.io client instance
    if (window.socket) {
      // Capture specified event types or all events
      const typesToCapture = types.length > 0 ? types : ['*'];

      typesToCapture.forEach(eventType => {
        if (eventType === '*') {
          // Capture all events (requires socket.io internals)
          const originalEmit = window.socket.onevent;
          window.socket.onevent = function(packet) {
            const [event, data] = packet.data;
            window.socketEvents.push({
              type: event,
              data: data,
              timestamp: Date.now(),
            });
            return originalEmit.call(this, packet);
          };
        } else {
          // Capture specific event
          window.socket.on(eventType, (data) => {
            window.socketEvents.push({
              type: eventType,
              data: data,
              timestamp: Date.now(),
            });
          });
        }
      });

      console.log(`🎧 Capturing Socket.io events: ${typesToCapture.join(', ')}`);
    } else {
      console.warn('⚠ Socket.io client not found on window.socket');
    }
  }, eventTypes);
}

/**
 * Wait for specific WebSocket event to be received
 * @param {import('@playwright/test').Page} page - Playwright page instance
 * @param {string} eventType - Socket.io event type to wait for
 * @param {object} options - Wait options
 * @param {number} options.timeout - Max wait time in ms (default: 2000)
 * @param {object} options.dataMatch - Optional partial data to match
 * @returns {Promise<SocketEvent>} The matched event
 * @throws {Error} If event not received within timeout
 */
async function waitForSocketEvent(page, eventType, options = {}) {
  const { timeout = 2000, dataMatch = null } = options;

  try {
    const event = await page.waitForFunction(
      ({ type, match }) => {
        if (!window.socketEvents) return false;

        const events = window.socketEvents.filter(e => e.type === type);
        if (events.length === 0) return false;

        if (!match) return events[events.length - 1]; // Return latest event

        // Check if any event matches the partial data
        for (const event of events) {
          let matches = true;
          for (const key in match) {
            if (JSON.stringify(event.data[key]) !== JSON.stringify(match[key])) {
              matches = false;
              break;
            }
          }
          if (matches) return event;
        }
        return false;
      },
      { type: eventType, match: dataMatch },
      { timeout }
    );

    const eventData = await event.jsonValue();
    console.log(`✓ Received Socket.io event: ${eventType}`);
    return eventData;
  } catch (error) {
    throw new Error(
      `WebSocket event "${eventType}" not received within ${timeout}ms${
        dataMatch ? ` with data matching ${JSON.stringify(dataMatch)}` : ''
      }`
    );
  }
}

/**
 * Retrieve all captured events of specific type
 * @param {import('@playwright/test').Page} page - Playwright page instance
 * @param {string|null} eventType - Filter by event type (null = return all)
 * @returns {Promise<SocketEvent[]>} Array of captured events
 */
async function getSocketEvents(page, eventType = null) {
  const events = await page.evaluate((type) => {
    if (!window.socketEvents) return [];

    if (type) {
      return window.socketEvents.filter(e => e.type === type);
    }
    return window.socketEvents;
  }, eventType);

  return events || [];
}

/**
 * Clear all captured events
 * @param {import('@playwright/test').Page} page - Playwright page instance
 * @returns {Promise<void>}
 */
async function clearSocketEvents(page) {
  await page.evaluate(() => {
    window.socketEvents = [];
  });
  console.log('🧹 Cleared Socket.io event capture');
}

/**
 * Assert that event was received with expected data
 * @param {import('@playwright/test').Page} page - Playwright page instance
 * @param {string} eventType - Event type to check
 * @param {object|null} expectedData - Expected event data (partial match)
 * @returns {Promise<void>}
 * @throws {Error} If event not found or data doesn't match
 */
async function assertEventReceived(page, eventType, expectedData = null) {
  const events = await getSocketEvents(page, eventType);

  if (events.length === 0) {
    throw new Error(`Expected to receive Socket.io event "${eventType}", but none were captured`);
  }

  if (!expectedData) {
    console.log(`✓ Event "${eventType}" was received`);
    return; // Just check event was received
  }

  // Check if any event matches expected data (partial match)
  const matchingEvent = events.find(event => {
    for (const key in expectedData) {
      if (JSON.stringify(event.data[key]) !== JSON.stringify(expectedData[key])) {
        return false;
      }
    }
    return true;
  });

  if (!matchingEvent) {
    throw new Error(
      `Expected Socket.io event "${eventType}" with data ${JSON.stringify(expectedData)}, ` +
      `but received: ${JSON.stringify(events.map(e => e.data))}`
    );
  }

  console.log(`✓ Event "${eventType}" received with matching data`);
}

/**
 * Wait for WebSocket connection to be established
 * @param {import('@playwright/test').Page} page - Playwright page instance
 * @param {number} timeout - Max wait time in ms (default: 5000)
 * @returns {Promise<void>}
 * @throws {Error} If connection not established within timeout
 */
async function waitForSocketConnection(page, timeout = 5000) {
  try {
    await page.waitForFunction(
      () => {
        return window.socket && window.socket.connected;
      },
      { timeout }
    );
    console.log('✓ WebSocket connection established');
  } catch (error) {
    throw new Error(`WebSocket connection not established within ${timeout}ms`);
  }
}

/**
 * Check if WebSocket is connected
 * @param {import('@playwright/test').Page} page - Playwright page instance
 * @returns {Promise<boolean>} True if connected
 */
async function isSocketConnected(page) {
  return await page.evaluate(() => {
    return window.socket && window.socket.connected;
  });
}

module.exports = {
  captureSocketEvents,
  waitForSocketEvent,
  getSocketEvents,
  clearSocketEvents,
  assertEventReceived,
  waitForSocketConnection,
  isSocketConnected,
};

/**
 * @typedef {Object} SocketEvent
 * @property {string} type - Event type (e.g., "vote-update", "poll-state-changed")
 * @property {any} data - Event payload
 * @property {number} timestamp - When event was received
 */
