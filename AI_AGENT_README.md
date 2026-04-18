# 🤖 Autonomous DevOps AI Agent v4.0
## Complete System Documentation

---

## Executive Summary

The AI Central Hub has been transformed into a **fully autonomous DevOps AI Agent** capable of:

- 🩺 **Self-Monitoring**: Real-time health checks with actual HTTP/gRPC probes
- 🛠️ **Self-Healing**: Auto-fixes issues with ≥90% confidence, suggests for novel problems
- 🧠 **Self-Learning**: Records every incident and outcome to improve future decisions
- 💻 **Code Generation**: Uses Ollama Cloud (qwen3.5:cloud) to generate fixes
- 📊 **Dashboard Intelligence**: In-app notifications and approval workflows
- 🎓 **Training Environment**: Safe practice area with simulated failures

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS AI AGENT                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  🧠 HEALTH ENGINE (js/ai-health-engine.js)                 │
│  ├── Real HTTP/gRPC health probes                          │
│  ├── 4 Golden Signals monitoring                           │
│  ├── Statistical anomaly detection                         │
│  └── SSL certificate expiry tracking                       │
│                                                              │
│  ⚡ HEALING ENGINE (js/ai-healing-engine.js)               │
│  ├── Auto-execute (≥90% confidence)                        │
│  ├── Suggest + confirm (novel issues)                      │
│  ├── LLM-powered code generation                          │
│  └── Safety guardrails (rate limits, rollback)            │
│                                                              │
│  📚 LEARNING ENGINE (js/ai-learning-engine.js)             │
│  ├── Railway PostgreSQL storage                            │
│  ├── Action success rate tracking                          │
│  ├── Pattern recognition                                   │
│  └── Recommendation engine                                  │
│                                                              │
│  📊 NOTIFICATION CENTER (js/ai-notification-center.js)     │
│  ├── Real-time toast notifications                        │
│  ├── Action approval workflows                            │
│  ├── Notification persistence                             │
│  └── Interactive action buttons                            │
│                                                              │
│  🎓 TEST SERVICE (js/ai-test-service.js)                   │
│  ├── Simulated failures for practice                     │
│  ├── 6 failure scenarios                                   │
│  └── Training history & statistics                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Module Details

### 1. AI Health Engine

**File**: `js/ai-health-engine.js`

**Purpose**: Real-time health monitoring with actual endpoints

**Features**:
- HTTP/gRPC health probes (not simulations!)
- 4 Golden Signals: Latency, Traffic, Errors, Saturation
- SSL certificate expiry tracking with auto-renewal alerts
- Multi-layer health: Application → Service → Infrastructure
- Statistical anomaly detection using 3-sigma rule
- Cascading dependency health checks

**Monitored Services**:
| Service | Type | Health Checks |
|---------|------|---------------|
| Discord Bot | Bot | Gateway WS, Commands, Railway status |
| Website | Web | HTTP 200, Response time, SSL |
| API Backend | API | DB connection, Redis, Endpoints |
| PostgreSQL | DB | Connection count, Query performance |
| Redis | Cache | Connection health, Memory usage |
| Token Vault | Web | HTTP 200, Session health |

**Configuration**:
```javascript
config: {
    pollIntervalActive: 30000,      // 30 seconds
    pollIntervalBackground: 300000, // 5 minutes
    healthCheckTimeout: 10000,      // 10 seconds
    sslWarningDays: 7,              // Alert at 7 days
    sslCriticalDays: 1              // Critical at 1 day
}
```

---

### 2. AI Healing Engine

**File**: `js/ai-healing-engine.js`

**Purpose**: Autonomous remediation with safety guardrails

**Decision Logic**:
```
Confidence ≥ 90% + Known playbook = AUTO-EXECUTE
Confidence < 90% OR Unknown issue = SUGGEST + CONFIRM
```

**Safety Configuration**:
```javascript
config: {
    autoHealConfidence: 0.90,     // 90% threshold
    maxAutoFixesPerHour: 10,       // Prevent flapping
    cooldownMinutes: 5,            // Between fixes on same service
    rollbackDepth: 10              // Keep 10 backups
}
```

**Predefined Playbooks** (Auto-Execute):
1. **service_offline**: Check Railway → Redeploy → Verify
2. **database_connection_failed**: Restart pool → Check limits → Escalate
3. **ssl_certificate_expiring**: Notify → Renew → Verify
4. **dependency_failure**: Heal dependency → Circuit breaker → Notify
5. **discord_bot_offline**: Check Discord API → Validate token → Restart

**Suggest+Confirm Playbooks**:
1. **high_error_rate**: Analyze logs → Correlate changes → Suggest fix
2. **slow_response_time**: Analyze queries → Check resources → Suggest optimization
3. **configuration_drift**: Detect drift → Analyze impact → Suggest sync

**LLM Integration**:
- Uses `qwen3.5:cloud` via Ollama Cloud for unknown issues
- Generates JSON with: root cause, actions, confidence
- Can generate actual code/config fixes

---

### 3. AI Learning Engine

**File**: `js/ai-learning-engine.js`

**Purpose**: Reinforcement learning from incidents

**Storage**:
- **Primary**: Railway PostgreSQL (4 tables)
- **Fallback**: localStorage (last 1000 records)

**Tables**:
1. **ai_incidents**: All detected incidents
2. **ai_outcomes**: Success/failure of healing actions
3. **ai_patterns**: Discovered patterns and correlations
4. **ai_recommendations**: AI-generated suggestions

**Learning Features**:
- Action success rate calculation
- Pattern recognition (temporal, error-based, service correlation)
- Similar incident finding
- Recommendation engine
- Historical analysis (MTTR, worst services, best actions)

**Data Retention**:
- Incidents: 1 year
- Outcomes: 2 years
- Patterns: Forever
- Recommendations: 90 days

---

### 4. AI Notification Center

**File**: `js/ai-notification-center.js`

**Purpose**: In-app dashboard notifications

**Notification Types**:
| Type | Color | Auto-Dismiss | Icon |
|------|-------|--------------|------|
| INFO | Blue | Yes | ℹ️ |
| SUCCESS | Green | Yes | ✅ |
| WARNING | Yellow | No | ⚠️ |
| CRITICAL | Red | No | 🚨 |
| AUTO_REMEDIATION | Purple | No | 🤖 |
| SUGGESTION | Orange | No | 💡 |
| LEARNING | Cyan | Yes | 🧠 |

**Features**:
- Toast notifications (auto-dismiss for info/success)
- Persistent notification panel
- Unread count badge
- Action approval workflows
- Progress bars for long-running operations
- Alert sounds for critical notifications
- Notification history (24 hours)

**UI Components**:
1. **Toast**: Temporary popup with actions
2. **Badge**: Unread count on navbar
3. **Panel**: Full notification history
4. **Details Modal**: Full incident details

---

### 5. AI Test Service

**File**: `js/ai-test-service.js`

**Purpose**: Safe training environment for AI

**Scenarios** (Safe to break!):
1. **slow_response**: 2-5 second response times
2. **high_error_rate**: 50% error rate
3. **service_offline**: Complete failure
4. **memory_leak**: Gradual degradation
5. **database_timeout**: DB connection issues
6. **configuration_error**: Wrong environment variables

**Training Features**:
- One-click scenario injection
- "Let AI Heal" button to trigger remediation
- Training history with success/failure tracking
- Statistics: success rate, avg healing time, scenario counts
- Safe experimentation (doesn't affect production)

---

## Workflow Example

### Scenario: Service Goes Offline

```
1. HEALTH ENGINE detects Discord Bot is offline
   ↓
2. Checks 3 times consecutively (all fail)
   ↓
3. Triggers HEALING ENGINE with issue type 'service_offline'
   ↓
4. HEALING ENGINE looks up playbook:
      - Confidence: 95% (≥ 90%, so AUTO-EXECUTE)
   ↓
5. NOTIFICATION CENTER shows:
      "🤖 AI is automatically fixing Discord Bot"
   ↓
6. HEALING ENGINE executes:
      a. Check Discord API status ✓
      b. Check bot token ✓
      c. Check Railway status ✓
      d. Restart bot service ✓
      e. Verify bot responds ✓
   ↓
7. NOTIFICATION CENTER shows:
      "✅ Issue Resolved: Discord Bot is back online"
   ↓
8. LEARNING ENGINE records:
      - Incident: service_offline
      - Actions: All succeeded
      - Duration: 45 seconds
      - Success: true
   ↓
9. Future similar incidents will use same playbook
```

---

## Configuration

### Ollama Cloud Setup

**Model**: `qwen3.5:cloud`

**Configuration**:
```javascript
// In ollama-cloud-integration.js
config: {
    baseUrl: 'https://ollama-cloud.reddgr.com',
    defaultModel: 'qwen3.5:cloud',
    fallbackModel: 'llama3.2:latest',
    temperature: 0.3  // Lower = more precise for code
}
```

**API Key**: Store in vault's shared variables as `OLLAMA_API_KEY`

### Railway PostgreSQL Setup

**Steps**:
1. Create PostgreSQL database in Railway dashboard
2. Add `DATABASE_URL` to vault's shared variables
3. Tables auto-create on first run
4. Verify: Run `\dt` in Railway console

**Fallback**: If Railway DB unavailable, uses localStorage + IndexedDB

### Service Definitions

**Customize in ai-health-engine.js**:
```javascript
serviceDefinitions: {
    'your-service': {
        name: 'Your Service',
        url: 'https://your-service.com',
        healthEndpoint: '/health',
        type: 'web|api|bot|db',
        dependencies: ['dependency-1', 'dependency-2'],
        critical: true|false,
        sslDomain: 'your-service.com',
        expectedStatus: 200,
        timeout: 10000
    }
}
```

---

## Usage

### For Users

**Dashboard Notifications**:
- Click 🔔 badge in navbar to see all notifications
- Green/blue notifications auto-dismiss
- Yellow/red notifications require attention
- Click "Approve" to allow AI to proceed with suggestions

**Training the AI**:
1. Go to AI Central Hub
2. Find "🎓 AI Training Ground" panel
3. Click any scenario button to break the test service
4. Click "🔧 Let AI Heal" to watch AI fix it
5. Review training history to see success rates

### For Administrators

**Monitor AI Decisions**:
- Check notification panel for all AI actions
- Review training statistics
- Adjust confidence thresholds if needed

**Manual Override**:
- Dismiss any AI suggestion
- Stop any active scenario
- Rollback any automatic change

---

## Safety Features

### Rate Limiting
- Max 10 auto-fixes per hour (prevents flapping)
- 5-minute cooldown between fixes on same service
- Exponential backoff on recurring failures

### Rollback System
- Keeps last 10 configuration backups
- Automatic rollback if fix makes things worse
- One-click rollback in notification panel

### Escalation
- Escalates to human after 3 failed attempts
- Critical issues show immediate notifications
- Approval required for risky operations (DB changes, DNS)

### Data Protection
- Anonymizes data before LLM processing
- Stores only necessary incident data
- Falls back to local-only mode if cloud unavailable

---

## Troubleshooting

### AI Not Auto-Fixing
1. Check confidence threshold (default: 90%)
2. Verify playbook has `autoExecute: true`
3. Check rate limits (max 10/hour)
4. Check cooldown period (5 minutes)

### Notifications Not Showing
1. Check if AINotificationCenter initialized
2. Check browser console for errors
3. Verify notification panel exists in DOM

### Learning Not Working
1. Verify Railway PostgreSQL connection
2. Check `DATABASE_URL` in vault variables
3. Check browser console for DB errors
4. Fallback to localStorage if needed

### LLM Not Responding
1. Check Ollama Cloud status
2. Verify `OLLAMA_API_KEY` is set
3. Check network connectivity
4. Fallback to rule-based playbooks

---

## Performance Metrics

**Target Metrics**:
| Metric | Target | Current |
|--------|--------|---------|
| MTTD (Mean Time To Detection) | < 30 seconds | ✅ |
| MTTR (Mean Time To Resolution) | < 5 minutes | Depends on issue |
| Auto-heal Success Rate | > 85% | Learning... |
| False Positive Rate | < 10% | Learning... |
| Prediction Accuracy | > 80% | Building baselines... |

---

## Future Enhancements

### Phase 2 (Recommended)
1. **Custom Health Endpoints**: Support `/health`, `/ready`, `/metrics`
2. **Service Mesh Tracing**: Distributed tracing across services
3. **Cost Optimization**: Auto-scale down during low traffic
4. **Security Scanning**: Automated vulnerability detection

### Phase 3 (Advanced)
1. **Custom AI Model**: Train on your specific patterns
2. **Chaos Engineering**: Automated failure testing
3. **Predictive Scaling**: Scale before traffic spikes
4. **Multi-Cloud**: Support AWS, GCP, Azure

---

## Files Created

```
Dissident-Tokens-Vault/
├── js/
│   ├── ai-health-engine.js          # Real-time monitoring
│   ├── ai-healing-engine.js          # Auto-remediation
│   ├── ai-learning-engine.js         # ML & learning
│   ├── ai-notification-center.js     # Dashboard UI
│   └── ai-test-service.js             # Training environment
├── AI_DATABASE_SCHEMA.md              # PostgreSQL schema
└── AI_AGENT_README.md                 # This file
```

---

## Support

**For Issues**:
1. Check browser console for errors
2. Review notification panel for AI actions
3. Check training statistics
4. Review this documentation

**Configuration Help**:
- Modify playbooks in `ai-healing-engine.js`
- Adjust thresholds in config objects
- Add custom scenarios to `ai-test-service.js`

---

## Credits

**Version**: 4.0  
**Created**: 2024  
**Components**:
- Ollama Cloud (qwen3.5:cloud)
- Railway PostgreSQL
- Custom AI/ML modules

---

## License

Part of Dissident Token Vault - Internal Use Only
