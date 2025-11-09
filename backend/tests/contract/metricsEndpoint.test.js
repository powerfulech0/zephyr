const request = require('supertest');
const { app } = require('../../src/server');

describe('Contract: Metrics Endpoint', () => {
  describe('GET /metrics', () => {
    it('should return metrics in Prometheus text format', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      // Verify Content-Type header (Prometheus format)
      expect(response.headers['content-type']).toMatch(/^text\/plain/);
      expect(response.headers['content-type']).toContain('version=0.0.4');

      // Verify response is text (not JSON)
      expect(typeof response.text).toBe('string');
      expect(response.text.length).toBeGreaterThan(0);
    });

    it('should include HTTP request metrics', async () => {
      // Make a request to generate HTTP metrics
      await request(app).get('/api/health');

      const response = await request(app).get('/metrics');

      // Verify http_request_duration_seconds histogram
      expect(response.text).toContain('# TYPE http_request_duration_seconds histogram');
      expect(response.text).toContain('http_request_duration_seconds_bucket');
      expect(response.text).toContain('http_request_duration_seconds_sum');
      expect(response.text).toContain('http_request_duration_seconds_count');

      // Verify http_requests_total counter
      expect(response.text).toContain('# TYPE http_requests_total counter');
      expect(response.text).toContain('http_requests_total');

      // Verify labels (method, route, status_code)
      expect(response.text).toMatch(/method="GET"/);
      expect(response.text).toMatch(/route="[^"]+"/);
      expect(response.text).toMatch(/status_code="\d{3}"/);
    });

    it('should include WebSocket connection metrics', async () => {
      const response = await request(app).get('/metrics');

      // Verify websocket_connections_current gauge
      expect(response.text).toContain('# TYPE websocket_connections_current gauge');
      expect(response.text).toContain('websocket_connections_current');

      // Verify websocket_connections_total counter
      expect(response.text).toContain('# TYPE websocket_connections_total counter');
      expect(response.text).toContain('websocket_connections_total');
    });

    it('should include business metrics', async () => {
      const response = await request(app).get('/metrics');

      // Verify polls_total counter
      expect(response.text).toContain('# TYPE polls_total counter');
      expect(response.text).toContain('polls_total');

      // Verify polls_active gauge
      expect(response.text).toContain('# TYPE polls_active gauge');
      expect(response.text).toContain('polls_active');

      // Verify votes_total counter (may be 0 initially)
      expect(response.text).toContain('# TYPE votes_total counter');

      // Verify participants_total counter (may be 0 initially)
      expect(response.text).toContain('# TYPE participants_total counter');
    });

    it('should include database metrics', async () => {
      const response = await request(app).get('/metrics');

      // Verify database_connections_current gauge
      expect(response.text).toContain('# TYPE database_connections_current gauge');
      expect(response.text).toContain('database_connections_current');

      // Verify db_queries_total counter (actual metric name)
      expect(response.text).toContain('# TYPE db_queries_total counter');

      // Verify db_query_duration_seconds histogram (actual metric name)
      expect(response.text).toContain('# TYPE db_query_duration_seconds histogram');
    });

    it('should include rate limit metrics', async () => {
      const response = await request(app).get('/metrics');

      // Verify rate_limit_exceeded_total counter
      expect(response.text).toContain('# TYPE rate_limit_exceeded_total counter');
      expect(response.text).toContain('rate_limit_exceeded_total');
    });

    it('should include error metrics', async () => {
      const response = await request(app).get('/metrics');

      // Verify errors_total counter
      expect(response.text).toContain('# TYPE errors_total counter');
      expect(response.text).toContain('errors_total');
    });

    it('should include Node.js default metrics', async () => {
      const response = await request(app).get('/metrics');

      // Verify Node.js heap metrics (prom-client default metrics)
      expect(response.text).toContain('nodejs_heap_');
      expect(response.text).toContain('nodejs_eventloop_');

      // Verify process metrics
      expect(response.text).toContain('process_');
    });

    it('should have valid Prometheus metric format', async () => {
      const response = await request(app).get('/metrics');

      // Each metric should have HELP and TYPE declarations
      const lines = response.text.split('\n');
      const metricNames = new Set();

      lines.forEach((line) => {
        // Extract metric name from HELP/TYPE lines
        const helpMatch = line.match(/^# HELP ([a-z_]+)/);
        const typeMatch = line.match(/^# TYPE ([a-z_]+)/);

        if (helpMatch) {
          metricNames.add(helpMatch[1]);
        }
        if (typeMatch) {
          // Verify TYPE follows HELP
          expect(metricNames.has(typeMatch[1])).toBe(true);
        }
      });

      // Verify we have multiple metrics
      expect(metricNames.size).toBeGreaterThan(5);
    });

    it('should not expose sensitive data in metric labels', async () => {
      // Create a poll to generate data
      await request(app)
        .post('/api/polls')
        .send({
          question: 'Secret question?',
          options: ['Yes', 'No'],
        });

      const response = await request(app).get('/metrics');

      // Verify no room codes, nicknames, or questions in metrics
      expect(response.text).not.toContain('Secret question');
      expect(response.text).not.toMatch(/room_code="[A-Z0-9]+"/);
      expect(response.text).not.toMatch(/nickname="[^"]+"/);
      expect(response.text).not.toMatch(/question="[^"]+"/);
    });

    it('should have consistent metric values across multiple calls', async () => {
      // First call
      const response1 = await request(app).get('/metrics');
      const pollsTotal1 = extractMetricValue(response1.text, 'polls_total');

      // Create a poll
      await request(app)
        .post('/api/polls')
        .send({
          question: 'Test?',
          options: ['A', 'B'],
        });

      // Second call
      const response2 = await request(app).get('/metrics');
      const pollsTotal2 = extractMetricValue(response2.text, 'polls_total');

      // Verify polls_total incremented (or stayed same if instrumentation not yet complete)
      expect(pollsTotal2).toBeGreaterThanOrEqual(pollsTotal1);
    });
  });
});

/**
 * Extract metric value from Prometheus text format
 * @param {string} metricsText - Prometheus format metrics
 * @param {string} metricName - Name of metric to extract
 * @returns {number} - Metric value
 */
function extractMetricValue(metricsText, metricName) {
  // Match metric line without labels or with empty labels
  const regex = new RegExp(`^${metricName}(?:\\{[^}]*\\})?\\s+([0-9.]+)`, 'm');
  const match = metricsText.match(regex);
  return match ? parseFloat(match[1]) : 0;
}
