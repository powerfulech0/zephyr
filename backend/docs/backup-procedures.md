# Zephyr Voting App - Backup and Recovery Procedures

**Last Updated**: 2025-11-09
**Version**: 2.0.0
**Owner**: Platform Team

## Purpose

This document outlines backup strategies, recovery procedures, and disaster recovery protocols for the Zephyr voting application's data layer (PostgreSQL database and Redis cache).

---

## Table of Contents

1. [Backup Strategy Overview](#backup-strategy-overview)
2. [PostgreSQL Backup Procedures](#postgresql-backup-procedures)
3. [Redis Backup Procedures](#redis-backup-procedures)
4. [Recovery Procedures](#recovery-procedures)
5. [Disaster Recovery](#disaster-recovery)
6. [Backup Testing](#backup-testing)
7. [Retention Policies](#retention-policies)

---

## Backup Strategy Overview

### Recovery Objectives

| Metric | Target | Method |
|--------|--------|--------|
| **RTO** (Recovery Time Objective) | 1 hour | Automated RDS restore + application redeploy |
| **RPO** (Recovery Point Objective) | 5 minutes | Continuous PITR (Point-in-Time Recovery) |
| **Backup Frequency** | Daily automated + continuous WAL | RDS automated backups + transaction logs |
| **Backup Retention** | 30 days | Configurable in RDS settings |

### Backup Types

1. **Automated RDS Snapshots** (PostgreSQL)
   - Daily snapshots at 03:00 UTC
   - Retained for 30 days
   - Full database backup

2. **Point-in-Time Recovery** (PostgreSQL)
   - Continuous transaction log backups
   - Restore to any second within retention period
   - 5-minute RPO

3. **Manual Snapshots** (PostgreSQL)
   - Before major deployments, schema changes
   - Retained indefinitely (until manually deleted)
   - Tagged with reason and date

4. **Redis Persistence** (Session/Cache Data)
   - AOF (Append-Only File) for session recovery
   - RDB snapshots every 6 hours
   - Not critical (ephemeral data)

---

## PostgreSQL Backup Procedures

### Automated Backups (AWS RDS)

#### Configuration

**RDS Instance Settings**:
```text
Backup Retention Period: 30 days
Backup Window: 03:00-04:00 UTC (low traffic period)
Enable Automatic Backups: Yes
Enable Point-in-Time Recovery: Yes
Enable Enhanced Monitoring: Yes
```

**Terraform Example**:
```hcl
resource "aws_db_instance" "zephyr_postgres" {
  identifier = "zephyr-production-db"
  engine     = "postgres"
  engine_version = "14.7"

  # Backup configuration
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  # Point-in-Time Recovery
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  # Snapshots
  copy_tags_to_snapshot = true
  skip_final_snapshot   = false
  final_snapshot_identifier = "zephyr-production-final-snapshot"
}
```

#### Verify Automated Backups

```bash
# AWS CLI - List automated snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier zephyr-production-db \
  --snapshot-type automated \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime,Status]' \
  --output table

# Expected output:
# |  Snapshot ID                         | Create Time           | Status     |
# |  rds:zephyr-production-db-2025-11-09 | 2025-11-09T03:00:00Z | available  |
# |  rds:zephyr-production-db-2025-11-08 | 2025-11-08T03:00:00Z | available  |
```

### Manual Backups (Pre-Deployment)

#### Create Manual Snapshot

```bash
# Before major deployment or schema change
aws rds create-db-snapshot \
  --db-instance-identifier zephyr-production-db \
  --db-snapshot-identifier zephyr-production-manual-$(date +%Y%m%d-%H%M%S) \
  --tags Key=Reason,Value="Pre-deployment backup" \
         Key=DeploymentVersion,Value="v2.0.0"

# Verify snapshot creation
aws rds describe-db-snapshots \
  --db-snapshot-identifier zephyr-production-manual-20251109-140000 \
  --query 'DBSnapshots[0].[Status,PercentProgress]'
```

#### Create Manual Snapshot (pg_dump)

Alternative method using pg_dump for maximum portability:

```bash
# Dump entire database
pg_dump -h <DB_HOST> -U <DB_USER> -d zephyr \
  --format=custom \
  --compress=9 \
  --file=zephyr-backup-$(date +%Y%m%d-%H%M%S).dump

# Dump specific schemas only
pg_dump -h <DB_HOST> -U <DB_USER> -d zephyr \
  --schema=public \
  --format=custom \
  --file=zephyr-schema-backup-$(date +%Y%m%d-%H%M%S).dump

# Upload to S3 for long-term storage
aws s3 cp zephyr-backup-20251109-140000.dump \
  s3://zephyr-backups/manual/2025/11/09/ \
  --storage-class STANDARD_IA \
  --server-side-encryption AES256
```

### Backup Verification

Run monthly to ensure backups are restorable:

```bash
# Restore snapshot to test instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier zephyr-test-restore \
  --db-snapshot-identifier rds:zephyr-production-db-2025-11-09 \
  --db-instance-class db.t3.micro \
  --no-publicly-accessible

# Wait for restore to complete (5-10 minutes)
aws rds wait db-instance-available --db-instance-identifier zephyr-test-restore

# Verify data integrity
psql -h <TEST_DB_HOST> -U <DB_USER> -d zephyr -c "
  SELECT
    'polls' AS table_name, COUNT(*) AS row_count FROM polls
  UNION ALL
  SELECT 'participants', COUNT(*) FROM participants
  UNION ALL
  SELECT 'votes', COUNT(*) FROM votes
  UNION ALL
  SELECT 'audit_logs', COUNT(*) FROM audit_logs;
"

# Delete test instance after verification
aws rds delete-db-instance \
  --db-instance-identifier zephyr-test-restore \
  --skip-final-snapshot
```

---

## Redis Backup Procedures

### Persistence Configuration

**ElastiCache Redis Settings**:
```text
Snapshot Retention: 5 days
Snapshot Window: 04:00-05:00 UTC
AOF (Append-Only File): Enabled (for durability)
RDB Snapshots: Every 6 hours
```

**Configuration (redis.conf equivalent)**:
```text
appendonly yes
appendfsync everysec  # Write to AOF every second
save 900 1            # Save RDB if 1 key changed in 15 minutes
save 300 10           # Save RDB if 10 keys changed in 5 minutes
save 60 10000         # Save RDB if 10,000 keys changed in 1 minute
```

### Manual Redis Backup

```bash
# Trigger manual snapshot (ElastiCache)
aws elasticache create-snapshot \
  --cache-cluster-id zephyr-production-redis \
  --snapshot-name zephyr-redis-manual-$(date +%Y%m%d-%H%M%S)

# Wait for snapshot completion
aws elasticache describe-snapshots \
  --snapshot-name zephyr-redis-manual-20251109-140000 \
  --query 'Snapshots[0].SnapshotStatus'
```

### Redis Backup Verification

```bash
# Restore snapshot to test cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id zephyr-redis-test \
  --snapshot-name zephyr-redis-manual-20251109-140000 \
  --cache-node-type cache.t3.micro \
  --engine redis

# Verify data
redis-cli -h <TEST_REDIS_HOST> DBSIZE
redis-cli -h <TEST_REDIS_HOST> KEYS "*session*" | head -10

# Delete test cluster
aws elasticache delete-cache-cluster \
  --cache-cluster-id zephyr-redis-test
```

**Note**: Redis stores ephemeral session data. Backup is for continuity, not critical for recovery. Application can rebuild sessions on restart.

---

## Recovery Procedures

### Full Database Recovery (RDS Snapshot)

**Use Case**: Complete database failure, corruption, or accidental data deletion

**Steps**:

1. **Identify Recovery Point**
   ```bash
   # List available snapshots
   aws rds describe-db-snapshots \
     --db-instance-identifier zephyr-production-db \
     --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]' \
     --output table
   ```

2. **Create Recovery Instance**
   ```bash
   # Restore from snapshot to new instance
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier zephyr-production-recovery \
     --db-snapshot-identifier rds:zephyr-production-db-2025-11-09 \
     --db-instance-class db.t3.large \
     --vpc-security-group-ids sg-xxxxxxxxx \
     --db-subnet-group-name zephyr-db-subnet-group \
     --publicly-accessible false

   # Wait for restore (10-20 minutes for production database)
   aws rds wait db-instance-available \
     --db-instance-identifier zephyr-production-recovery
   ```

3. **Verify Data Integrity**
   ```bash
   # Connect to recovery instance
   psql -h <RECOVERY_DB_HOST> -U <DB_USER> -d zephyr

   # Verify row counts
   SELECT COUNT(*) FROM polls;
   SELECT COUNT(*) FROM participants;
   SELECT COUNT(*) FROM votes;

   # Verify latest poll created
   SELECT room_code, question, created_at
   FROM polls
   ORDER BY created_at DESC
   LIMIT 5;
   ```

4. **Promote Recovery Instance to Production**
   ```bash
   # Method 1: Update application DNS/endpoint
   # Point application to new endpoint: zephyr-production-recovery.xxx.rds.amazonaws.com

   # Method 2: Rename instances (requires downtime)
   # Rename original: zephyr-production-db → zephyr-production-db-old
   # Rename recovery: zephyr-production-recovery → zephyr-production-db

   aws rds modify-db-instance \
     --db-instance-identifier zephyr-production-recovery \
     --new-db-instance-identifier zephyr-production-db \
     --apply-immediately
   ```

5. **Update Application Configuration**
   ```bash
   # Update Kubernetes Secret or Environment Variables
   kubectl edit secret zephyr-secrets -n zephyr
   # Update DB_HOST to new endpoint

   # Restart application pods
   kubectl rollout restart deployment/zephyr-backend -n zephyr
   ```

6. **Verify Application Health**
   ```bash
   # Check health endpoint
   curl https://api.zephyr.example.com/api/health

   # Monitor logs for database connection
   kubectl logs -f deployment/zephyr-backend -n zephyr | grep "Database connected"
   ```

### Point-in-Time Recovery (PITR)

**Use Case**: Recover to specific time before accidental data deletion or corruption

**Steps**:

1. **Determine Recovery Time**
   ```bash
   # Example: Data corruption discovered at 14:30 UTC
   # Need to restore to 14:25 UTC (5 minutes before incident)
   RECOVERY_TIME="2025-11-09T14:25:00Z"
   ```

2. **Restore to Point-in-Time**
   ```bash
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier zephyr-production-db \
     --target-db-instance-identifier zephyr-production-pitr \
     --restore-time $RECOVERY_TIME \
     --db-instance-class db.t3.large \
     --vpc-security-group-ids sg-xxxxxxxxx \
     --db-subnet-group-name zephyr-db-subnet-group

   # Wait for restore
   aws rds wait db-instance-available \
     --db-instance-identifier zephyr-production-pitr
   ```

3. **Verify Restored Data**
   ```bash
   psql -h <PITR_DB_HOST> -U <DB_USER> -d zephyr

   # Check data at recovery time
   SELECT * FROM polls WHERE created_at <= '2025-11-09 14:25:00';

   # Verify corrupted data is not present
   SELECT * FROM polls WHERE created_at > '2025-11-09 14:25:00';
   # Should return no results (data after incident not present)
   ```

4. **Promote PITR Instance** (Same as steps 4-6 above)

### Single Table Recovery (pg_restore)

**Use Case**: Restore specific table from pg_dump backup

**Steps**:

1. **List Tables in Backup**
   ```bash
   pg_restore --list zephyr-backup-20251109-140000.dump | grep "TABLE DATA"
   ```

2. **Restore Specific Table**
   ```bash
   # Restore polls table only
   pg_restore \
     --host=<DB_HOST> \
     --username=<DB_USER> \
     --dbname=zephyr \
     --table=polls \
     --clean \
     --if-exists \
     zephyr-backup-20251109-140000.dump
   ```

3. **Verify Restore**
   ```bash
   psql -h <DB_HOST> -U <DB_USER> -d zephyr -c "SELECT COUNT(*) FROM polls;"
   ```

---

## Disaster Recovery

### Multi-AZ Failover (Automated)

**RDS Multi-AZ Configuration**:
- Synchronous replication to standby in different AZ
- Automatic failover on primary failure
- Typically completes in <2 minutes

**Monitoring Failover**:
```bash
# Check RDS events for failover
aws rds describe-events \
  --source-identifier zephyr-production-db \
  --source-type db-instance \
  --duration 60 \
  --query 'Events[*].[Date,Message]' \
  --output table

# Expected event: "Multi-AZ failover completed"
```

**Application Impact**:
- Brief connection errors during failover
- Application retry logic handles automatically (see resilienceService.js)
- No manual intervention required

### Cross-Region Disaster Recovery

**Use Case**: Complete region failure (rare)

**Setup** (if required):
```bash
# Create read replica in different region
aws rds create-db-instance-read-replica \
  --db-instance-identifier zephyr-production-db-replica-us-west-2 \
  --source-db-instance-identifier arn:aws:rds:us-east-1:xxx:db:zephyr-production-db \
  --db-instance-class db.t3.large \
  --region us-west-2

# Promote replica to standalone (during disaster)
aws rds promote-read-replica \
  --db-instance-identifier zephyr-production-db-replica-us-west-2 \
  --region us-west-2
```

**Recovery Steps**:
1. Promote read replica in secondary region
2. Update DNS to point to secondary region
3. Redeploy application in secondary region
4. Verify health and functionality

**RTO**: 2-4 hours (manual process)
**RPO**: ~5 minutes (replication lag)

---

## Backup Testing

### Monthly Backup Verification

**Schedule**: First Sunday of each month at 10:00 UTC

**Automated Test Script** (backup-test.sh):
```bash
#!/bin/bash
set -e

SNAPSHOT_ID=$(aws rds describe-db-snapshots \
  --db-instance-identifier zephyr-production-db \
  --snapshot-type automated \
  --query 'DBSnapshots[0].DBSnapshotIdentifier' \
  --output text)

echo "Testing snapshot: $SNAPSHOT_ID"

# Restore to test instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier zephyr-backup-test \
  --db-snapshot-identifier $SNAPSHOT_ID \
  --db-instance-class db.t3.micro

# Wait for restore
aws rds wait db-instance-available --db-instance-identifier zephyr-backup-test

# Get endpoint
TEST_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier zephyr-backup-test \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

# Run integrity checks
psql -h $TEST_ENDPOINT -U postgres -d zephyr -c "
  SELECT
    'Data Integrity Check' AS test,
    COUNT(*) AS poll_count
  FROM polls;
"

# Cleanup
aws rds delete-db-instance \
  --db-instance-identifier zephyr-backup-test \
  --skip-final-snapshot

echo "Backup test passed successfully!"
```

**Run Test**:
```bash
chmod +x backup-test.sh
./backup-test.sh
```

---

## Retention Policies

### PostgreSQL

| Backup Type | Retention Period | Reason |
|-------------|-----------------|--------|
| Automated Snapshots | 30 days | RDS default, sufficient for most recovery scenarios |
| Manual Snapshots | Indefinite (tagged) | Pre-deployment, schema changes, audit compliance |
| PITR Transaction Logs | 30 days | Same as automated backups |
| pg_dump Archives (S3) | 90 days | Additional redundancy, cross-region storage |

### Redis

| Backup Type | Retention Period | Reason |
|-------------|-----------------|--------|
| RDB Snapshots | 5 days | Session data, not critical long-term |
| AOF Files | Continuous | Real-time durability, rotated daily |

### Audit Logs (Application Level)

| Data Type | Retention Period | Reason |
|-----------|-----------------|--------|
| Audit Logs Table | 90 days | Security compliance, forensics |
| Application Logs (CloudWatch) | 30 days | Operational debugging |

**Cleanup Jobs**:
```bash
# Delete old audit logs (run weekly via cron)
psql -h <DB_HOST> -U <DB_USER> -d zephyr -c \
  "DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';"

# Delete old pg_dump backups from S3 (run monthly)
aws s3 ls s3://zephyr-backups/manual/ --recursive | \
  awk '{if ($1 < "2025-08-01") print $4}' | \
  xargs -I {} aws s3 rm s3://zephyr-backups/{}
```

---

## Backup Checklist

### Pre-Deployment

- [ ] Create manual snapshot with deployment tag
- [ ] Verify snapshot creation completed successfully
- [ ] Tag snapshot with version and reason
- [ ] Document snapshot ID in deployment notes

### Monthly

- [ ] Run automated backup verification test
- [ ] Verify automated snapshots created successfully
- [ ] Check backup storage usage (S3, RDS)
- [ ] Review and cleanup old manual snapshots
- [ ] Test PITR recovery to random timestamp
- [ ] Update backup documentation if procedures changed

### Quarterly

- [ ] Full disaster recovery drill (restore to secondary region)
- [ ] Verify cross-region backups (if configured)
- [ ] Review retention policies and adjust if needed
- [ ] Audit backup access permissions (IAM roles)
- [ ] Review backup costs and optimize if necessary

---

## Troubleshooting

### Backup Failure

**Symptoms**: Automated snapshot not created

**Diagnosis**:
```bash
# Check RDS events for errors
aws rds describe-events \
  --source-identifier zephyr-production-db \
  --source-type db-instance \
  --duration 1440 \
  --query 'Events[?contains(Message, `backup`)]'
```

**Common Causes**:
- Insufficient storage space (RDS needs 20% free space for snapshots)
- Maintenance window conflict
- Long-running transactions preventing snapshot

**Resolution**:
- Increase RDS storage size
- Adjust backup window to avoid maintenance
- Identify and kill long-running queries

### Restore Failure

**Symptoms**: RDS restore stuck at 0% progress

**Diagnosis**:
```bash
# Check restore progress
aws rds describe-db-instances \
  --db-instance-identifier zephyr-production-recovery \
  --query 'DBInstances[0].[DBInstanceStatus,PercentProgress]'
```

**Common Causes**:
- Subnet group misconfiguration
- Security group preventing access
- Insufficient disk space in target instance class

**Resolution**:
- Delete failed restore and retry with correct configuration
- Check VPC, subnet, and security group settings

---

## Additional Resources

- [Operations Runbook](./runbook.md)
- [Architecture Documentation](./architecture.md)
- [AWS RDS Backup Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_CommonTasks.BackupRestore.html)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/14/backup.html)

---

**Document Maintenance**:
- Review quarterly
- Update after backup procedure changes
- Test all procedures annually
