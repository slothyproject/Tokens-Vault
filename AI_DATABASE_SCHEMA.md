# Autonomous DevOps AI Agent - Database Schema

## Overview

The AI Learning Engine uses Railway PostgreSQL for persistent storage of incidents, outcomes, and learning data.

## Database Configuration

### Connection
- **Database Type**: PostgreSQL
- **Connection**: Via `DATABASE_URL` environment variable in Railway
- **Tables**: Automatically created on first run

### Tables

#### 1. ai_incidents
Stores all detected incidents and health issues.

```sql
CREATE TABLE ai_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id VARCHAR(255) NOT NULL,
    issue_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    error_message TEXT,
    context JSONB,              -- Flexible context storage
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved BOOLEAN DEFAULT FALSE,
    resolution_time INTEGER,     -- milliseconds
    playbook_used VARCHAR(255),  -- Which playbook was applied
    remediation_id VARCHAR(255) -- Link to remediation
);

-- Indexes for performance
CREATE INDEX idx_incidents_service ON ai_incidents(service_id);
CREATE INDEX idx_incidents_type ON ai_incidents(issue_type);
CREATE INDEX idx_incidents_timestamp ON ai_incidents(timestamp);
CREATE INDEX idx_incidents_resolved ON ai_incidents(resolved);
```

#### 2. ai_outcomes
Tracks the success/failure of every healing action.

```sql
CREATE TABLE ai_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES ai_incidents(id),
    action VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    execution_time INTEGER,      -- milliseconds
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_outcomes_incident ON ai_outcomes(incident_id);
CREATE INDEX idx_outcomes_action ON ai_outcomes(action);
CREATE INDEX idx_outcomes_success ON ai_outcomes(success);
```

#### 3. ai_patterns
Stores discovered patterns and correlations.

```sql
CREATE TABLE ai_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_type VARCHAR(100) NOT NULL,
    service_id VARCHAR(255),
    pattern_data JSONB NOT NULL,
    confidence DECIMAL(4,3) DEFAULT 0.0,
    occurrence_count INTEGER DEFAULT 1,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patterns_type ON ai_patterns(pattern_type);
CREATE INDEX idx_patterns_service ON ai_patterns(service_id);
```

#### 4. ai_recommendations
Stores AI-generated recommendations.

```sql
CREATE TABLE ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id VARCHAR(255),
    recommendation_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    action_data JSONB,
    confidence DECIMAL(4,3) DEFAULT 0.0,
    applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMP,
    outcome VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recommendations_service ON ai_recommendations(service_id);
CREATE INDEX idx_recommendations_applied ON ai_recommendations(applied);
```

## Data Retention

| Table | Retention | Reason |
|-------|-----------|--------|
| ai_incidents | 1 year | Historical analysis |
| ai_outcomes | 2 years | Long-term learning |
| ai_patterns | Forever | Pattern library |
| ai_recommendations | 90 days | Temporary suggestions |

## Sample Queries

### Get action success rates
```sql
SELECT 
    action,
    COUNT(*) as total,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes,
    ROUND(100.0 * SUM(CASE WHEN success THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM ai_outcomes
GROUP BY action
ORDER BY success_rate DESC;
```

### Find similar incidents
```sql
SELECT *
FROM ai_incidents
WHERE issue_type = 'service_offline'
    AND service_id = 'dissident-bot'
    AND timestamp > NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC
LIMIT 10;
```

### Calculate MTTR (Mean Time To Resolution)
```sql
SELECT 
    service_id,
    AVG(resolution_time) as avg_resolution_time
FROM ai_incidents
WHERE resolved = TRUE
    AND resolution_time IS NOT NULL
GROUP BY service_id;
```

## Setup Instructions

1. Create a PostgreSQL database in Railway dashboard
2. Add `DATABASE_URL` to your vault's shared variables
3. The AI will auto-create tables on first run
4. Verify tables exist: `\dt` in Railway console

## Fallback

If Railway PostgreSQL is unavailable, the system falls back to:
- **localStorage**: For incidents and outcomes (last 1000)
- **IndexedDB**: For patterns and recommendations
- **In-memory**: Real-time processing only
