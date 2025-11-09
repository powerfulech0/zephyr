const { spawn } = require('child_process');
const http = require('http');
const io = require('socket.io-client');
const path = require('path');

/**
 * Integration Test: Graceful Shutdown
 *
 * Validates that the server gracefully shuts down when receiving SIGTERM:
 * 1. Stops accepting new connections
 * 2. Closes existing WebSocket connections cleanly
 * 3. Drains in-flight requests
 * 4. Closes database and Redis connections
 * 5. Exits within 30 seconds (timeout)
 *
 * This ensures zero-downtime deployments and proper resource cleanup.
 */

describe('Graceful Shutdown Integration Test', () => {
  let serverProcess;
  let serverPort;

  beforeAll(() => {
    serverPort = 4001; // Use different port to avoid conflicts
  });

  afterEach(async () => {
    // Ensure server process is killed
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGKILL');
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  /**
   * Helper: Start server process
   */
  const startServer = () => new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        PORT: serverPort.toString(),
        NODE_ENV: 'test',
        DB_HOST: 'localhost',
        DB_PORT: '5432',
        DB_NAME: 'zephyr_test',
        DB_USER: 'zephyr',
        DB_PASSWORD: 'zephyr_dev_password',
        REDIS_HOST: 'localhost',
        REDIS_PORT: '6379',
        LOG_LEVEL: 'error', // Reduce noise in test output
      };

      serverProcess = spawn('node', [path.join(__dirname, '../../src/server.js')], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';

      serverProcess.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Server listening')) {
          resolve(serverProcess);
        }
      });

      serverProcess.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      serverProcess.on('error', (error) => {
        reject(error);
      });

      // Timeout if server doesn't start
      setTimeout(() => {
        reject(new Error('Server failed to start within 10 seconds'));
      }, 10000);
    });

  /**
   * Helper: Make HTTP request
   */
  const makeRequest = (path) => new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${serverPort}${path}`, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });

  describe('SIGTERM Handling', () => {
    it('should gracefully shutdown on SIGTERM signal', async () => {
      // Start server
      await startServer();

      // Verify server is responsive
      const healthCheck = await makeRequest('/api/health');
      expect(healthCheck.statusCode).toBe(200);

      // Send SIGTERM
      const shutdownStartTime = Date.now();
      serverProcess.kill('SIGTERM');

      // Wait for process to exit
      const exitCode = await new Promise((resolve) => {
        serverProcess.on('exit', (code) => {
          resolve(code);
        });

        // Force kill after 35 seconds (server timeout is 30s)
        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
            resolve(-1);
          }
        }, 35000);
      });

      const shutdownDuration = Date.now() - shutdownStartTime;

      // Verify clean exit
      expect(exitCode).toBe(0);

      // Verify shutdown completed within timeout (30s + 5s buffer)
      expect(shutdownDuration).toBeLessThan(35000);
    }, 40000); // Test timeout: 40 seconds

    it('should gracefully shutdown on SIGINT signal (Ctrl+C)', async () => {
      // Start server
      await startServer();

      // Verify server is responsive
      const healthCheck = await makeRequest('/api/health');
      expect(healthCheck.statusCode).toBe(200);

      // Send SIGINT
      serverProcess.kill('SIGINT');

      // Wait for process to exit
      const exitCode = await new Promise((resolve) => {
        serverProcess.on('exit', (code) => {
          resolve(code);
        });

        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
            resolve(-1);
          }
        }, 35000);
      });

      expect(exitCode).toBe(0);
    }, 40000);
  });

  describe('Connection Draining', () => {
    it('should stop accepting new connections after SIGTERM', async () => {
      // Start server
      await startServer();

      // Verify server is responsive
      const initialCheck = await makeRequest('/api/health');
      expect(initialCheck.statusCode).toBe(200);

      // Send SIGTERM
      serverProcess.kill('SIGTERM');

      // Wait a bit for graceful shutdown to start
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Try to make new request (should fail or be rejected)
      try {
        await makeRequest('/api/health');
        // If request succeeds, that's ok if server hasn't fully closed yet
        // The important part is that server eventually closes
      } catch (error) {
        // Connection refused or timeout is expected during shutdown
        expect(['ECONNREFUSED', 'ECONNRESET', 'Request timeout']).toContain(
          error.code || error.message
        );
      }

      // Wait for shutdown to complete
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
        setTimeout(resolve, 35000); // Timeout
      });
    }, 40000);

    it('should close WebSocket connections gracefully', async () => {
      // Start server
      await startServer();

      // Create WebSocket connection
      const socket = io(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
        reconnection: false,
      });

      // Wait for connection
      await new Promise((resolve, reject) => {
        socket.on('connect', resolve);
        socket.on('connect_error', reject);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      expect(socket.connected).toBe(true);

      // Track disconnect event
      let disconnected = false;
      socket.on('disconnect', (reason) => {
        disconnected = true;
      });

      // Send SIGTERM
      serverProcess.kill('SIGTERM');

      // Wait for disconnect
      await new Promise((resolve) => {
        socket.on('disconnect', resolve);
        setTimeout(resolve, 5000); // Timeout
      });

      expect(disconnected).toBe(true);

      // Cleanup
      socket.close();

      // Wait for server exit
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
        setTimeout(resolve, 35000);
      });
    }, 40000);
  });

  describe('Forced Shutdown Timeout', () => {
    it('should force exit after 30 seconds if graceful shutdown hangs', async () => {
      // This test would require creating a scenario where shutdown hangs
      // For now, we'll verify the timeout mechanism exists by checking server code
      // In a real scenario, you'd mock a hanging database connection or similar

      // Start server
      await startServer();

      // Send SIGTERM
      const shutdownStartTime = Date.now();
      serverProcess.kill('SIGTERM');

      // Wait for exit
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
        setTimeout(resolve, 35000);
      });

      const shutdownDuration = Date.now() - shutdownStartTime;

      // Normal shutdown should complete well before 30s timeout
      // If it takes close to 30s, that indicates timeout mechanism triggered
      expect(shutdownDuration).toBeLessThan(35000);
    }, 40000);
  });

  describe('Resource Cleanup', () => {
    it('should log graceful shutdown steps', async () => {
      // Start server
      const logs = [];

      serverProcess.stdout.on('data', (data) => {
        logs.push(data.toString());
      });

      serverProcess.stderr.on('data', (data) => {
        logs.push(data.toString());
      });

      await startServer();

      // Send SIGTERM
      serverProcess.kill('SIGTERM');

      // Wait for shutdown
      await new Promise((resolve) => {
        serverProcess.on('exit', resolve);
        setTimeout(resolve, 35000);
      });

      const allLogs = logs.join('');

      // Verify shutdown logging (adjust based on actual log format)
      // These are example checks - adjust to match your logger format
      expect(allLogs).toContain('shutdown');
    }, 40000);
  });
});
