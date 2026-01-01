# Alert System Quick Reference Card

## 🚨 Alert Types at a Glance

| Alert | Threshold | Severity | What It Means |
|-------|-----------|----------|---------------|
| **error_burst** | 5+ errors/min | 🟡🟠🔴 | Service is failing rapidly |
| **high_latency** | 3 slow requests (>3s) | 🟡🟠🔴 | Performance degradation |
| **availability_issue** | 50%+ error rate | 🟡🟠🔴 | Service is mostly down |
| **high_memory_usage** | 85%+ heap | 🟠🔴⚫ | About to run out of memory |
| **high_cpu_usage** | 80%+ CPU | 🟠🔴⚫ | CPU exhaustion |
| **event_loop_lag** | 100ms+ lag | 🟡🟠🔴⚫ | Node.js blocking operations |
| **traffic_spike** | 3x baseline | 🟡🟠🔴 | Unusual traffic increase |
| **traffic_drop** | 70%+ drop | 🟡🟠🔴⚫ | Traffic disappeared |
| **auth_failure_spike** | 10+ failures/5min | 🟡🟠🔴⚫ | Possible attack |
| **database_connection_issue** | Disconnected | ⚫ | Database is unreachable |

**Legend**: 🟡 Low | 🟠 Medium | 🔴 High | ⚫ Critical

---

## 📊 Severity Levels

| Level | Symbol | When to Act | Examples |
|-------|--------|-------------|----------|
| **Low** | 🟡 | Monitor | 5-6 errors, 3-4s latency |
| **Medium** | 🟠 | Investigate | 85% memory, 7-9 errors |
| **High** | 🔴 | Act Now | 90% memory, 10+ errors |
| **Critical** | ⚫ | Emergency | 95% memory, DB down, 90% traffic drop |

---

## 🔧 Common Usage

### Record Auth Failures
```typescript
import { recordAuthFailure } from './collectors/alert-collector';

if (!authenticated) {
  recordAuthFailure('invalid_credentials');
}
```

### Record Custom Errors
```typescript
import { recordErrorEvent } from './collectors/alert-collector';

try {
  await riskyOperation();
} catch (error) {
  recordErrorEvent('OPERATION_FAILED');
}
```

### Check Alert Status
```typescript
import { getAlertStats } from './collectors/alert-collector';

const stats = getAlertStats();
console.log(`Active alerts: ${stats?.activeAlerts}`);
```

---

## 📁 Alert Data Location

```
restaurants-service/alerts/restaurants-service-alert-data.ndjson
delivery-service/alerts/delivery-service-alert-data.ndjson
```

Each line is a JSON object:
```json
{"timestamp":"2026-01-01T12:00:00Z","alert_name":"high_memory_usage","alert_state":"fired",...}
```

---

## ⚙️ Key Thresholds (Tunable)

```typescript
ERROR_BURST_THRESHOLD = 5          // errors in 1 min
HIGH_LATENCY_THRESHOLD = 3000      // 3 seconds
AVAILABILITY_ERROR_RATE = 0.5      // 50%
MEMORY_THRESHOLD_PERCENT = 85      // 85% heap
CPU_THRESHOLD_PERCENT = 80         // 80% usage
EVENT_LOOP_LAG_THRESHOLD = 100     // 100ms
TRAFFIC_SPIKE_MULTIPLIER = 3       // 3x baseline
AUTH_FAILURE_THRESHOLD = 10        // 10 failures/5min
```

Edit in: `src/alerts/alert-detector.ts`

---

## 🎯 What Each Alert Tells You

### Error Burst 💥
**Fired**: Something broke recently (API, database, dependency)  
**Action**: Check logs, recent deployments, external services

### High Latency 🐌
**Fired**: Requests are taking too long  
**Action**: Check database queries, external API calls, CPU usage

### Availability Issue 🚫
**Fired**: Most requests are failing  
**Action**: Check service health, dependencies, infrastructure

### High Memory 💾
**Fired**: Running out of heap space  
**Action**: Check for memory leaks, restart service if critical

### High CPU ⚡
**Fired**: CPU is maxed out  
**Action**: Check for infinite loops, heavy computations, optimize code

### Event Loop Lag ⏱️
**Fired**: Node.js event loop is blocked  
**Action**: Find and fix synchronous/blocking operations

### Traffic Spike 📈
**Fired**: Unusual traffic increase  
**Action**: Check for DDoS, viral content, or legitimate growth

### Traffic Drop 📉
**Fired**: Traffic disappeared  
**Action**: Check load balancer, DNS, upstream services

### Auth Failures 🔒
**Fired**: Many failed login attempts  
**Action**: Check for brute force attack, implement rate limiting

### Database Issue 🗄️
**Fired**: MongoDB connection lost  
**Action**: Check database service, network, credentials

---

## 🔍 Troubleshooting

### Alert Not Firing?
1. Check if alert middleware is enabled
2. Verify thresholds aren't too high
3. Ensure enough data (some alerts need baseline)

### Too Many Alerts?
1. Tune thresholds higher
2. Check for legitimate issues
3. Add hysteresis (already built-in)

### Alert Won't Resolve?
1. Check if condition actually cleared
2. Verify hysteresis thresholds
3. Review alert logic in alert-detector.ts

---

## 📞 Emergency Response

### Critical Alert Fired?

1. **Check Alert Details**
   ```bash
   tail -f alerts/*-alert-data.ndjson
   ```

2. **Assess Severity**
   - ⚫ Critical = Immediate action required
   - 🔴 High = Act within minutes
   - 🟠 Medium = Act within hour
   - 🟡 Low = Monitor and plan

3. **Common Actions**
   - Memory/CPU critical → Restart service
   - Database down → Check MongoDB service
   - Traffic spike → Enable rate limiting
   - Auth failures → Block suspicious IPs

4. **Post-Incident**
   - Review alert timeline
   - Analyze context metrics
   - Tune thresholds if needed
   - Document learnings

---

## 📚 More Information

- **Full Documentation**: `ALERT_TYPES_DOCUMENTATION.md`
- **Implementation Summary**: `ENHANCED_ALERTS_SUMMARY.md`
- **Code**: `src/alerts/alert-detector.ts`

---

## 💡 Pro Tips

1. **Baseline Learning**: Traffic alerts need 10 minutes to learn patterns
2. **Hysteresis**: Alerts resolve at lower thresholds to prevent flapping
3. **Context Matters**: Always check the context fields (CPU, memory, traffic_rate)
4. **Periodic Checks**: Alerts check every 30 seconds automatically
5. **NDJSON Format**: Easy to parse, grep, and analyze with standard tools

---

## 🎓 Quick Commands

```bash
# View recent alerts
tail -20 alerts/*-alert-data.ndjson

# Count alerts by type
grep -o '"alert_name":"[^"]*"' alerts/*.ndjson | sort | uniq -c

# Find critical alerts
grep '"severity":"critical"' alerts/*.ndjson

# Monitor in real-time
tail -f alerts/*-alert-data.ndjson | jq .

# Count fired vs resolved
grep '"alert_state":"fired"' alerts/*.ndjson | wc -l
grep '"alert_state":"resolved"' alerts/*.ndjson | wc -l
```

---

**Last Updated**: January 2026  
**Version**: 2.0 (Enhanced Alert System)

