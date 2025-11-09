/**
 * Test cleanup utilities to prevent hanging async operations
 * Ensures all connections, timers, and resources are properly closed
 */

const activeClients = new Set();
const activeServers = new Set();
const activeTimers = new Set();

/**
 * Track a Socket.io client for cleanup
 */
function trackClient(client) {
  activeClients.add(client);
  return client;
}

/**
 * Track an HTTP server for cleanup
 */
function trackServer(server) {
  activeServers.add(server);
  return server;
}

/**
 * Track a timeout for cleanup
 */
function trackTimeout(timeoutId) {
  activeTimers.add(timeoutId);
  return timeoutId;
}

/**
 * Clean up all tracked resources
 */
async function cleanupAll() {
  // Close all clients
  const clientPromises = Array.from(activeClients).map(client => {
    return new Promise((resolve) => {
      if (client && client.connected) {
        client.close();
      }
      resolve();
    });
  });
  await Promise.all(clientPromises);
  activeClients.clear();

  // Close all servers
  const serverPromises = Array.from(activeServers).map(server => {
    return new Promise((resolve) => {
      if (server && server.listening) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });
  await Promise.all(serverPromises);
  activeServers.clear();

  // Clear all timers
  activeTimers.forEach(timerId => {
    clearTimeout(timerId);
  });
  activeTimers.clear();

  // Small delay to allow cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 50));
}

/**
 * Clean up a specific client
 */
function cleanupClient(client) {
  if (client && client.connected) {
    client.close();
  }
  activeClients.delete(client);
}

/**
 * Clean up a specific server
 */
async function cleanupServer(server) {
  return new Promise((resolve) => {
    if (server && server.listening) {
      server.close(() => {
        activeServers.delete(server);
        resolve();
      });
    } else {
      activeServers.delete(server);
      resolve();
    }
  });
}

module.exports = {
  trackClient,
  trackServer,
  trackTimeout,
  cleanupAll,
  cleanupClient,
  cleanupServer,
};
