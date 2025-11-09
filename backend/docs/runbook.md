# Zephyr Voting App - Operations Runbook

**Last Updated**: 2025-11-09
**Version**: 2.0.0
**Maintainers**: Platform Team

## Purpose

This runbook provides step-by-step procedures for common operational tasks, incident response, and troubleshooting the Zephyr voting application in production.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Service Health Checks](#service-health-checks)
3. [Common Incidents](#common-incidents)
4. [Deployment Procedures](#deployment-procedures)
5. [Database Operations](#database-operations)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Scaling Operations](#scaling-operations)
8. [Emergency Procedures](#emergency-procedures)
9. [Post-Incident](#post-incident)

---

## Quick Reference

### Critical Endpoints

- **Production API**: https://api.zephyr.example.com
- **Health Check**: https://api.zephyr.example.com/api/health
- **Metrics**: https://api.zephyr.example.com/metrics (internal only)
- **Grafana Dashboard**: https://grafana.example.com/d/zephyr-overview
- **Prometheus**: https://prometheus.example.com (internal only)

### Critical Contacts

- **On-Call Engineer**: PagerDuty rotation
- **Platform Team**: #platform-team Slack channel
- **Database Team**: #database-support Slack channel
- **Security Team**: #security-incidents Slack channel

### Service Level Objectives (SLOs)

- **Uptime**: 99.9% during business hours (8am-8pm local)
- **Error Rate**: <1% of requests
- **Response Time**: P95 <500ms for API, P95 <100ms for database queries
- **Mean Time to Recovery (MTTR)**: <30 minutes for critical incidents

---

## Service Health Checks

### Manual Health Check

```bash
# Overall health (checks database, Redis, dependencies)
curl https://api.zephyr.example.com/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-11-09T12:00:00.000Z",
  "uptime": 86400,
  "dependencies": {
    "database": { "status": "up", "responseTime": 5 },
    "redis": { "status": "up", "responseTime": 2 }
  }
}
```

### Readiness Check (Load Balancer)

```bash
# Used by load balancers to determine if instance can receive traffic
curl https://api.zephyr.example.com/api/health/ready

# Returns 200 if database and Redis are available, 503 otherwise
```

### Liveness Check (Container Orchestrator)

```bash
# Used by Kubernetes/ECS to determine if process is responsive
curl https://api.zephyr.example.com/api/health/live

# Returns 200 if process is responsive, regardless of dependencies
```

### Metrics Check

```bash
# Check if metrics are being exposed
curl https://api.zephyr.example.com/metrics | head -20

# Should see Prometheus-formatted metrics
# If empty or errors, metrics collection is broken
```

---

## Common Incidents

### Incident 1: High Error Rate Alert

**Alert**: `http_errors_total` > 5% for 2 minutes

**Triage Steps**:

1. **Check Grafana Dashboard**
   ```bash
   # View Zephyr Overview dashboard
   open https://grafana.example.com/d/zephyr-overview

   # Look for:
   # - Error rate panel (which endpoints are failing?)
   # - Response time panel (timeouts?)
   # - Database performance (slow queries?)
   ```

2. **Check Application Logs**
   ```bash
   # View recent errors with correlation IDs
   kubectl logs -f deployment/zephyr-backend --since=5m | grep '"level":"error"'

   # Or via CloudWatch/Loki
   # Filter by: level=error, last 5 minutes
   ```

3. **Identify Error Type**
   - **Database timeouts**: See [Database Connection Issues](#database-connection-issues)
   - **Redis failures**: See [Redis Connection Issues](#redis-connection-issues)
   - **Client errors (400s)**: Likely invalid input, check validation logs
   - **Server errors (500s)**: Application bugs, check stack traces

4. **Immediate Mitigation**
   - If single instance failing: Restart that instance
   - If all instances failing: Check dependencies (database, Redis)
   - If client errors: Check for malicious traffic, apply rate limiting

### Incident 2: Database Connection Issues

**Symptoms**:
- Health check endpoint returns 503
- Logs show "ECONNREFUSED" or "timeout" errors
- Database query metrics show high latency or failures

**Triage Steps**:

1. **Verify Database Availability**
   ```bash
   # From bastion host or application server
   pg_isready -h <DB_HOST> -p 5432 -U <DB_USER>

   # Should return: "accepting connections"
   ```

2. **Check Connection Pool**
   ```bash
   # View metrics in Grafana
   # Look for: db_pool_connections (idle vs active)
   # If all connections active, pool is exhausted
   ```

3. **Check Database Load**
   ```bash
   # Connect to database
   psql -h <DB_HOST> -U <DB_USER> -d zephyr

   # Check active connections
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'zephyr';

   # Check long-running queries
   SELECT pid, now() - query_start AS duration, query
   FROM pg_stat_activity
   WHERE state = 'active' AND now() - query_start > interval '5 seconds'
   ORDER BY duration DESC;
   ```

**Mitigation**:

- **Pool exhausted**: Increase `DB_POOL_MAX` environment variable, redeploy
- **Database overloaded**: Scale database vertically (RDS: modify instance class)
- **Long-running queries**: Identify and kill blocking queries:
  ```sql
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <PID>;
  ```
- **Circuit breaker open**: Wait for circuit breaker to half-open (30s), retry

### Incident 3: Redis Connection Issues

**Symptoms**:
- WebSocket messages not broadcasting across instances
- Session state lost
- Logs show "ECONNREFUSED" errors to Redis

**Triage Steps**:

1. **Verify Redis Availability**
   ```bash
   # Test Redis connection
   redis-cli -h <REDIS_HOST> -p 6379 -a <REDIS_PASSWORD> ping

   # Should return: PONG
   ```

2. **Check Redis Memory**
   ```bash
   # Get Redis info
   redis-cli -h <REDIS_HOST> info memory

   # Look for:
   # - used_memory_human
   # - maxmemory_human
   # - eviction policy (should be allkeys-lru for session data)
   ```

**Mitigation**:

- **Redis down**: Restart Redis service, application will reconnect automatically (retry strategy)
- **Redis memory full**: Increase Redis instance size or enable eviction policy
- **Network partition**: Check security groups, verify Redis accessible from application VPC

### Incident 4: WebSocket Disconnections

**Symptoms**:
- Participants report not seeing real-time updates
- Logs show frequent disconnect/reconnect events
- Metrics show `websocket_connections_current` dropping

**Triage Steps**:

1. **Check WebSocket Metrics**
   ```bash
   # View in Grafana or query Prometheus
   # - websocket_connections_current (stable or fluctuating?)
   # - websocket_messages_total by direction (messages flowing?)
   ```

2. **Check Load Balancer Configuration**
   - Verify load balancer supports WebSocket (HTTP/1.1 Upgrade header)
   - Check idle timeout (should be >60 seconds for WebSocket)
   - Verify sticky sessions enabled if not using Redis adapter

3. **Check Application Logs**
   ```bash
   # Look for disconnect reasons
   kubectl logs -f deployment/zephyr-backend | grep '"event":"disconnect"'
   ```

**Mitigation**:

- **Load balancer misconfigured**: Update timeout settings, enable WebSocket support
- **Redis adapter failing**: Check [Redis Connection Issues](#incident-3-redis-connection-issues)
- **Client-side issues**: Verify frontend reconnection logic

### Incident 5: Deployment Failure

**Symptoms**:
- GitHub Actions deploy workflow fails
- New pods/containers not starting
- Health checks failing after deployment

**Triage Steps**:

1. **Check Deployment Logs**
   ```bash
   # Kubernetes
   kubectl describe deployment zephyr-backend
   kubectl logs deployment/zephyr-backend --tail=100

   # Docker Compose
   docker compose logs backend --tail=100
   ```

2. **Common Failure Reasons**:
   - **Environment variables missing**: Check ConfigMap/Secrets
   - **Database migration failed**: Check migration logs
   - **Image pull failed**: Verify container registry credentials
   - **Health check failing**: Check dependency availability (database, Redis)

**Mitigation**:

- **Failed migration**: Rollback migration with `npm run migrate:down`, fix migration, redeploy
- **Missing env vars**: Add missing variables to ConfigMap/Secrets, redeploy
- **Rollback deployment**:
  ```bash
  # Kubernetes
  kubectl rollout undo deployment/zephyr-backend

  # Docker Compose
  docker tag zephyr-backend:v1.9.0 zephyr-backend:latest
  docker compose up -d backend
  ```

---

## Deployment Procedures

### Standard Deployment

**Prerequisites**:
- Tests passing on main branch (CI/CD)
- Database migrations tested in staging
- Deployment approval (if required)

**Steps**:

1. **Trigger Deployment**
   ```bash
   # Via GitHub Actions (manual workflow dispatch)
   # Select environment: production
   # Input: tag or branch (e.g., v2.0.0 or main)
   ```

2. **Monitor Deployment**
   ```bash
   # Watch rollout status
   kubectl rollout status deployment/zephyr-backend --timeout=5m

   # Check pod readiness
   kubectl get pods -l app=zephyr-backend
   ```

3. **Verify Health**
   ```bash
   # Check health endpoint
   curl https://api.zephyr.example.com/api/health

   # Check metrics being collected
   curl https://api.zephyr.example.com/metrics | grep "zephyr"
   ```

4. **Smoke Tests**
   ```bash
   # Create poll
   curl -X POST https://api.zephyr.example.com/api/polls \
     -H "Content-Type: application/json" \
     -d '{"question":"Test?","options":["A","B"]}'

   # Should return roomCode
   ```

5. **Monitor for 15 Minutes**
   - Watch Grafana dashboard for error spikes
   - Monitor logs for unexpected errors
   - Verify websocket_connections_current is stable

### Rollback Procedure

**When to Rollback**:
- Error rate >5% for 5 minutes after deployment
- Health checks failing
- Critical bugs discovered in production

**Steps**:

1. **Automated Rollback** (if deployment workflow detects failure)
   ```bash
   # GitHub Actions will automatically rollback
   # Check workflow logs for confirmation
   ```

2. **Manual Rollback**
   ```bash
   # Kubernetes
   kubectl rollout undo deployment/zephyr-backend
   kubectl rollout status deployment/zephyr-backend

   # Docker Compose
   docker tag zephyr-backend:v1.9.0 zephyr-backend:latest
   docker compose up -d backend
   ```

3. **Rollback Database Migration** (if needed)
   ```bash
   # SSH to application server
   cd /opt/zephyr/backend
   npm run migrate:down

   # Verify rollback
   npm run migrate:status
   ```

4. **Verify Rollback Success**
   ```bash
   # Check health
   curl https://api.zephyr.example.com/api/health

   # Check error rate in Grafana
   # Should return to normal levels within 2 minutes
   ```

5. **Post-Rollback**
   - Notify team in #platform-team Slack
   - Create incident report
   - Identify and fix root cause before next deployment

---

## Database Operations

### Run Migration

```bash
# Production environment
npm run migrate:up -- --env production

# Check status
npm run migrate:status
```

### Rollback Migration

```bash
# Rollback last migration
npm run migrate:down -- --env production

# Verify
npm run migrate:status
```

### Manual Database Query

```bash
# Connect to production database (via bastion host)
psql -h <DB_HOST> -U <DB_USER> -d zephyr

# Count active polls
SELECT COUNT(*) FROM polls WHERE is_active = true;

# View recent audit logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

### Cleanup Old Data

```bash
# Expire old polls (automated, but can run manually)
psql -h <DB_HOST> -U <DB_USER> -d zephyr -c \
  "UPDATE polls SET is_active = false WHERE expires_at < NOW() AND is_active = true;"

# Purge old audit logs (90 day retention)
psql -h <DB_HOST> -U <DB_USER> -d zephyr -c \
  "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';"
```

---

## Monitoring & Alerts

### Alert: High Error Rate

**Trigger**: `http_errors_total` > 5% for 2 minutes

**Response**: See [Incident 1: High Error Rate](#incident-1-high-error-rate-alert)

### Alert: Slow Database Queries

**Trigger**: `db_query_duration_seconds` P95 > 100ms for 5 minutes

**Response**:
1. Check slow query logs in database
2. Identify missing indexes
3. Scale database if necessary
4. Add indexes via migration

### Alert: High Memory Usage

**Trigger**: `nodejs_heap_used_percent` > 90% for 5 minutes

**Response**:
1. Check for memory leaks in application logs
2. Restart affected instances
3. Investigate memory-intensive operations
4. Scale horizontally (add more instances)

### Alert: Rate Limit Exceeded

**Trigger**: `rate_limit_exceeded_total` > 100 per minute

**Response**:
1. Check audit logs for IP addresses
2. Identify if malicious (DDoS) or legitimate traffic spike
3. If malicious: Block IP at load balancer level
4. If legitimate: Increase rate limit thresholds

---

## Scaling Operations

### Horizontal Scaling (Add Instances)

```bash
# Kubernetes
kubectl scale deployment zephyr-backend --replicas=5

# Docker Compose
docker compose up -d --scale backend=3
```

### Vertical Scaling (Increase Resources)

```bash
# Update deployment resource limits
kubectl edit deployment zephyr-backend

# Change:
# resources:
#   limits:
#     memory: 2Gi
#     cpu: 1000m
```

### Database Scaling

```bash
# AWS RDS: Modify instance class via console
# GCP Cloud SQL: Scale via gcloud CLI
gcloud sql instances patch zephyr-db --tier=db-n1-highmem-4
```

---

## Emergency Procedures

### Complete Service Outage

**Response**:

1. **Declare Incident**
   - Post in #incidents Slack channel
   - Page on-call engineer via PagerDuty
   - Set status page to "Major Outage"

2. **Triage**
   - Check all dependencies: database, Redis, load balancer
   - Review recent changes (deployments, config changes)
   - Check cloud provider status pages

3. **Mitigation**
   - If deployment-related: Rollback immediately
   - If database failure: Failover to replica (if available)
   - If infrastructure: Engage cloud provider support

4. **Communication**
   - Update status page every 15 minutes
   - Notify stakeholders via email
   - Post updates in #incidents

### Data Loss Incident

**Response**:

1. **STOP ALL WRITES**
   - Set application to read-only mode if possible
   - Scale down to prevent further data corruption

2. **Assess Damage**
   - Determine scope of data loss
   - Identify last known good backup

3. **Restore from Backup**
   - See [Backup Procedures](./backup-procedures.md)
   - Restore to point-in-time before data loss

4. **Post-Incident**
   - Conduct thorough root cause analysis
   - Implement safeguards to prevent recurrence

### Security Incident

**Response**:

1. **Isolate**
   - Block malicious IPs at load balancer
   - Rotate compromised credentials immediately
   - Enable additional logging

2. **Notify Security Team**
   - Post in #security-incidents Slack
   - Provide audit logs and evidence

3. **Investigate**
   - Review audit logs for unauthorized access
   - Check database for data exfiltration
   - Analyze attack patterns

4. **Remediate**
   - Apply security patches
   - Update firewall rules
   - Conduct security audit

---

## Post-Incident

### Incident Report Template

```markdown
# Incident Report: [Brief Description]

**Date**: YYYY-MM-DD
**Duration**: X hours Y minutes
**Severity**: Critical / High / Medium / Low
**Impact**: [Number of users affected, services degraded]

## Timeline
- HH:MM - Incident detected (how?)
- HH:MM - On-call paged
- HH:MM - Root cause identified
- HH:MM - Mitigation applied
- HH:MM - Service restored
- HH:MM - Incident closed

## Root Cause
[Detailed explanation of what went wrong]

## Resolution
[Steps taken to resolve the incident]

## Action Items
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]
- [ ] [Monitoring improvement]
- [ ] [Documentation update]

## Lessons Learned
[What went well, what could be improved]
```

### Post-Incident Review

- Schedule within 48 hours of incident resolution
- Include all responders
- Focus on process improvements, not blame
- Update runbook with new procedures

---

## Useful Commands Reference

### Logs

```bash
# Tail application logs
kubectl logs -f deployment/zephyr-backend

# Search logs for correlation ID
kubectl logs deployment/zephyr-backend | grep "correlationId\":\"abc123"

# View logs from specific time range
kubectl logs deployment/zephyr-backend --since=1h
```

### Metrics

```bash
# Query Prometheus
curl "http://prometheus.example.com/api/v1/query?query=http_request_duration_seconds"

# View current error rate
curl "http://prometheus.example.com/api/v1/query?query=rate(http_errors_total[5m])"
```

### Database

```bash
# Check database size
psql -c "SELECT pg_size_pretty(pg_database_size('zephyr'));"

# Check table sizes
psql -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(tablename::regclass))
         FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(tablename::regclass) DESC;"

# Check active connections
psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'zephyr';"
```

### Redis

```bash
# Check Redis memory usage
redis-cli info memory

# Check number of keys
redis-cli dbsize

# Monitor Redis commands in real-time
redis-cli monitor
```

---

## Additional Resources

- [Architecture Documentation](./architecture.md)
- [Backup Procedures](./backup-procedures.md)
- [Deployment Guide](../README.md#deployment)
- [Grafana Dashboards](https://grafana.example.com)
- [Prometheus Alerts](../prometheus-alerts.yml)

---

**Document Maintenance**:
- Review and update quarterly
- Update after major incidents
- Add new procedures as they are developed
