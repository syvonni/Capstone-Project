# Monitoring & Observability Guide

This guide provides comprehensive instructions for implementing monitoring and observability in the Capstone project.

## Table of Contents

- [Overview](#overview)
- [Monitoring Fundamentals](#monitoring-fundamentals)
- [Types of Monitoring](#types-of-monitoring)
- [Metrics](#metrics)
- [Logging](#logging)
- [Tracing](#tracing)
- [Alerting](#alerting)
- [Dashboards](#dashboards)
- [Monitoring Tools](#monitoring-tools)
- [Implementation Guide](#implementation-guide)
- [Best Practices](#best-practices)

---

## Overview

Monitoring and observability are critical for maintaining healthy, performant, and reliable applications in production.

**Key Concepts:**
- **Monitoring**: Collecting and analyzing data about system behavior
- **Observability**: Understanding system internal state from external outputs
- **Metrics**: Numerical measurements over time
- **Logs**: Discrete events with context
- **Traces**: Request lifecycle across services
- **Alerts**: Notifications when thresholds are breached

---

## Monitoring Fundamentals

### The Three Pillars of Observability

**1. Metrics (Numbers)**
- Quantitative data over time
- Examples: Request rate, error rate, response time
- Best for: Trend analysis, alerting, dashboards

**2. Logs (Events)**
- Discrete events with timestamps
- Examples: "User logged in", "Database query failed"
- Best for: Debugging, auditing, troubleshooting

**3. Traces (Context)**
- Request lifecycle across services
- Examples: User request flow through microservices
- Best for: Distributed systems, performance optimization

### Monitoring Maturity Model

**Level 1: Basic Monitoring**
- Server uptime
- Basic health checks
- Error logs

**Level 2: Application Monitoring**
- Application metrics
- Performance metrics
- Business metrics

**Level 3: Observability**
- Distributed tracing
- Real-time dashboards
- Proactive alerting

**Level 4: Intelligence**
- Anomaly detection
- Predictive analytics
- Automated remediation

---

## Types of Monitoring

### 1. Infrastructure Monitoring

**What to Monitor:**
- CPU usage
- Memory usage
- Disk usage
- Network I/O
- System load

**Example:**
```javascript
const os = require('os');

function getSystemMetrics() {
  return {
    cpu: os.cpus(),
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      usage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
    },
    load: os.loadavg()
  };
}

// Log every 30 seconds
setInterval(() => {
  logger.info('System metrics', getSystemMetrics());
}, 30000);
```

### 2. Application Monitoring

**What to Monitor:**
- Request rate
- Response times (p50, p95, p99)
- Error rates
- Active connections
- Queue lengths

**Example:**
```javascript
const promClient = require('prom-client');

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware to track requests
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe(
      { method: req.method, route: req.path, status_code: res.statusCode },
      duration
    );
    httpRequestsTotal.inc(
      { method: req.method, route: req.path, status_code: res.statusCode }
    );
  });
  
  next();
});
```

### 3. Database Monitoring

**What to Monitor:**
- Connection pool usage
- Query performance
- Slow queries
- Replication lag
- Database size

**Example:**
```javascript
const mongoose = require('mongoose');

function getDatabaseMetrics() {
  const connections = mongoose.connection;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    state: states[connections.readyState],
    host: connections.host,
    port: connections.port,
    name: connections.name,
    collectionCount: Object.keys(connections.collections).length
  };
}

// Log database metrics
setInterval(() => {
  logger.info('Database metrics', getDatabaseMetrics());
}, 60000);
```

### 4. Business Monitoring

**What to Monitor:**
- User registrations
- Feature usage
- Conversion rates
- Revenue metrics
- User engagement

**Example:**
```javascript
// Track business events
function trackBusinessEvent(event, data) {
  logger.info('Business event', {
    event,
    ...data,
    timestamp: new Date().toISOString()
  });
  
  // Send to analytics service
  analytics.track(event, data);
}

// Usage
trackBusinessEvent('variable_created', {
  userId: req._userId,
  variableId: variable._id,
  calculationMethod: variable.calculationMethod
});
```

### 5. Security Monitoring

**What to Monitor:**
- Failed login attempts
- Rate limit violations
- Unauthorized access attempts
- Suspicious patterns
- API abuse

**Example:**
```javascript
// Track security events
function trackSecurityEvent(event, data) {
  logger.warn('Security event', {
    event,
    ...data,
    timestamp: new Date().toISOString(),
    severity: 'high'
  });
  
  // Send to security team
  securityAlert(event, data);
}

// Usage
if (loginAttempts > 5) {
  trackSecurityEvent('brute_force_detected', {
    email: req.body.email,
    ip: req.ip,
    attempts: loginAttempts
  });
}
```

---

## Metrics

### Metric Types

**1. Counter**
- Monotonically increasing value
- Examples: Requests total, errors total
- Use for: Counting events

```javascript
const requestCounter = new promClient.Counter({
  name: 'requests_total',
  help: 'Total number of requests'
});

requestCounter.inc(); // Increment by 1
requestCounter.inc(5); // Increment by 5
```

**2. Gauge**
- Value that can go up or down
- Examples: Memory usage, active connections
- Use for: Current state

```javascript
const memoryGauge = new promClient.Gauge({
  name: 'memory_usage_bytes',
  help: 'Current memory usage in bytes'
});

memoryGauge.set(process.memoryUsage().heapUsed);
memoryGauge.inc(100); // Increase by 100
memoryGauge.dec(50); // Decrease by 50
```

**3. Histogram**
- Distribution of values
- Examples: Request duration, response size
- Use for: Percentiles

```javascript
const requestDuration = new promClient.Histogram({
  name: 'request_duration_seconds',
  help: 'Request duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5]
});

requestDuration.observe(0.5); // Record 0.5s
requestDuration.observe(1.2); // Record 1.2s
```

**4. Summary**
- Similar to histogram but client-side calculation
- Examples: Request duration (with percentiles)
- Use for: Pre-calculated percentiles

```javascript
const requestSummary = new promClient.Summary({
  name: 'request_duration_summary',
  help: 'Request duration summary',
  percentiles: [0.5, 0.9, 0.95, 0.99]
});

requestSummary.observe(0.5);
```

### Metric Best Practices

**Naming Conventions**
- Use snake_case
- Include unit in name (e.g., `_seconds`, `_bytes`)
- Use consistent prefixes (e.g., `http_`, `db_`)

**Labels**
- Use labels for dimensions (e.g., method, status)
- Keep cardinality low (avoid high-cardinality labels)
- Use consistent label values

**Examples:**
```javascript
// Good
http_requests_total{method="GET",route="/variables",status_code="200"}

// Bad (high cardinality)
http_requests_total{user_id="12345",request_id="abc123"}
```

### Example: Feature-Specific Metrics

```javascript
// Variables feature metrics
const variableMetrics = {
  created: new promClient.Counter({
    name: 'variables_created_total',
    help: 'Total number of variables created',
    labelNames: ['calculation_method']
  }),
  
  updated: new promClient.Counter({
    name: 'variables_updated_total',
    help: 'Total number of variables updated'
  }),
  
  deleted: new promClient.Counter({
    name: 'variables_deleted_total',
    help: 'Total number of variables deleted'
  }),
  
  listRequests: new promClient.Histogram({
    name: 'variables_list_duration_seconds',
    help: 'Duration of variable list requests',
    buckets: [0.1, 0.5, 1, 2, 5]
  })
};

// Usage
variableMetrics.created.inc({ calculation_method: 'per_unit' });
variableMetrics.listRequests.observe(0.3);
```

---

## Logging

### Log Levels

**ERROR**: Errors that need immediate attention
```javascript
logger.error('Database connection failed', {
  error: err.message,
  stack: err.stack,
  retryCount: 3
});
```

**WARN**: Warning conditions that should be investigated
```javascript
logger.warn('High memory usage', {
  usage: '85%',
  threshold: '80%'
});
```

**INFO**: Informational messages about normal operation
```javascript
logger.info('Variable created', {
  variableId: variable._id,
  userId: req._userId,
  name: variable.name
});
```

**DEBUG**: Detailed information for debugging
```javascript
logger.debug('Processing request', {
  method: req.method,
  path: req.path,
  query: req.query
});
```

### Structured Logging

**Why Structured Logging?**
- Machine-readable
- Easy to parse and query
- Consistent format
- Better for analysis

**Example:**
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Structured log
logger.info('Variable created', {
  event: 'variable_created',
  variableId: variable._id,
  userId: req._userId,
  name: variable.name,
  calculationMethod: variable.calculationMethod,
  timestamp: new Date().toISOString()
});
```

### Log Context

**Adding Context to Logs**
```javascript
// Add request context
app.use((req, res, next) => {
  req.logContext = {
    requestId: req.id,
    userId: req._userId,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };
  next();
});

// Use context in logs
logger.info('Processing request', {
  ...req.logContext,
  path: req.path,
  method: req.method
});
```

### Log Aggregation

**Centralized Logging**
```javascript
// Send logs to centralized service
const { createLogger, transports } = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

const logger = createLogger({
  transports: [
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: { node: 'http://localhost:9200' },
      index: 'application-logs'
    })
  ]
});
```

---

## Tracing

### Distributed Tracing

**What is Tracing?**
- Tracks a request across multiple services
- Shows the complete lifecycle of a request
- Identifies performance bottlenecks
- Helps debug distributed systems

**Example:**
```javascript
const opentelemetry = require('@opentelemetry/api');
const { trace } = opentelemetry;

// Create a span
const tracer = trace.getTracer('business-service');

async function createVariable(data) {
  const span = tracer.startSpan('createVariable');
  
  try {
    // Database operation
    const dbSpan = tracer.startSpan('database.create', {
      parent: span
    });
    const variable = await Variable.create(data);
    dbSpan.end();
    
    // Audit logging
    const auditSpan = tracer.startSpan('audit.log', {
      parent: span
    });
    await logAuditEvent('variable_created', variable._id);
    auditSpan.end();
    
    return variable;
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

### Trace Context Propagation

**Propagating Trace Context**
```javascript
// Add trace headers to outgoing requests
const tracer = trace.getTracer('business-service');

async function callAuditService(data) {
  const span = tracer.startSpan('callAuditService');
  
  try {
    const headers = {};
    trace.propagation.inject(trace.setSpanContext(span), headers);
    
    const response = await axios.post(
      'http://audit-service/api/audit',
      data,
      { headers }
    );
    
    return response.data;
  } finally {
    span.end();
  }
}
```

---

## Alerting

### Alert Rules

**1. Infrastructure Alerts**
```yaml
# Prometheus alert rules
groups:
  - name: infrastructure
    rules:
      - alert: HighCPUUsage
        expr: cpu_usage_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is {{ $value }}% for 5 minutes"
      
      - alert: HighMemoryUsage
        expr: memory_usage_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value }}% for 5 minutes"
```

**2. Application Alerts**
```yaml
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} for 5 minutes"
      
      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow response time detected"
          description: "P95 response time is {{ $value }}s"
```

**3. Business Alerts**
```yaml
groups:
  - name: business
    rules:
      - alert: LowUserActivity
        expr: rate(user_sessions_total[1h]) < 10
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Low user activity detected"
          description: "User activity rate is {{ $value }}/hour"
```

### Alert Severity Levels

**Critical**: Immediate action required
- System down
- Data loss
- Security breach

**Warning**: Investigate soon
- Performance degradation
- High resource usage
- Elevated error rates

**Info**: For awareness only
- Scheduled maintenance
- Deployment completed
- Feature usage milestone

### Alert Channels

**Email**
```javascript
// Send alert via email
const nodemailer = require('nodemailer');

async function sendAlert(alert) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.ALERT_EMAIL,
      pass: process.env.ALERT_PASSWORD
    }
  });

  await transporter.sendMail({
    from: process.env.ALERT_EMAIL,
    to: 'oncall@example.com',
    subject: `[${alert.severity}] ${alert.summary}`,
    text: alert.description
  });
}
```

**Slack**
```javascript
// Send alert to Slack
const axios = require('axios');

async function sendSlackAlert(alert) {
  await axios.post(process.env.SLACK_WEBHOOK_URL, {
    text: `[${alert.severity}] ${alert.summary}`,
    attachments: [{
      color: alert.severity === 'critical' ? 'danger' : 'warning',
      text: alert.description
    }]
  });
}
```

**PagerDuty**
```javascript
// Create PagerDuty incident
const axios = require('axios');

async function createPagerDutyIncident(alert) {
  await axios.post('https://api.pagerduty.com/incidents', {
    incident: {
      type: 'incident',
      title: alert.summary,
      service: { id: process.env.PAGERDUTY_SERVICE_ID },
      urgency: alert.severity === 'critical' ? 'high' : 'low',
      body: {
        type: 'incident_body',
        details: alert.description
      }
    }
  }, {
    headers: {
      'Authorization': `Token token=${process.env.PAGERDUTY_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
}
```

---

## Dashboards

### Dashboard Design Principles

**1. Relevance**
- Show metrics that matter
- Align with business goals
- Focus on actionable insights

**2. Clarity**
- Clear labels and titles
- Consistent units and scales
- Appropriate visualizations

**3. Context**
- Show trends over time
- Compare with baselines
- Include thresholds

### Example Dashboard: Variables Feature

```javascript
// Grafana dashboard configuration
{
  "dashboard": {
    "title": "Variables Feature",
    "panels": [
      {
        "title": "Variables Created (24h)",
        "targets": [
          {
            "expr": "sum(increase(variables_created_total[24h]))"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Variables List Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{route=\"/variables\"}[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Variables List Response Time (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, variables_list_duration_seconds)"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Variables by Calculation Method",
        "targets": [
          {
            "expr": "sum by (calculation_method) (variables_created_total)"
          }
        ],
        "type": "piechart"
      }
    ]
  }
}
```

### Key Dashboards

**1. System Overview**
- Overall health status
- Key metrics at a glance
- Active alerts

**2. Application Performance**
- Request rate
- Response times
- Error rates
- Resource usage

**3. Business Metrics**
- User activity
- Feature usage
- Conversion rates
- Revenue

**4. Infrastructure**
- Server health
- Database performance
- Network status
- Storage capacity

---

## Monitoring Tools

### Open Source Tools

**Prometheus**
- Metrics collection and storage
- Powerful query language (PromQL)
- Alert management
- Free and open source

**Grafana**
- Visualization and dashboards
- Supports multiple data sources
- Alerting capabilities
- Free and open source

**ELK Stack**
- Elasticsearch: Search and analytics
- Logstash: Log processing
- Kibana: Visualization
- Free and open source

**Jaeger**
- Distributed tracing
- OpenTelemetry compatible
- Free and open source

### Commercial Tools

**Datadog**
- Full-stack monitoring
- APM, infrastructure, logs
- Expensive but comprehensive

**New Relic**
- APM and infrastructure
- Good for beginners
- Expensive

**Splunk**
- Log analysis and SIEM
- Powerful but complex
- Expensive

### Cloud Provider Tools

**AWS CloudWatch**
- Metrics and logs
- Integrated with AWS services
- Pay-as-you-go

**Google Cloud Monitoring**
- Metrics and logs
- Integrated with GCP
- Pay-as-you-go

**Azure Monitor**
- Metrics and logs
- Integrated with Azure
- Pay-as-you-go

---

## Implementation Guide

### Step 1: Choose Monitoring Stack

**For Development:**
- Winston for logging
- Console for metrics
- Basic health checks

**For Production:**
- Prometheus + Grafana for metrics
- ELK Stack for logs
- Jaeger for tracing
- PagerDuty for alerting

### Step 2: Implement Metrics

**Backend Setup**
```javascript
// backend/services/business-service/src/monitoring/metrics.js
const promClient = require('prom-client');

// Create registry
const register = new promClient.Registry();

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  register
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  register
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

module.exports = { httpRequestDuration, httpRequestsTotal };
```

### Step 3: Implement Logging

**Backend Setup**
```javascript
// backend/services/business-service/src/monitoring/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'business-service' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### Step 4: Implement Tracing

**Backend Setup**
```javascript
// backend/services/business-service/src/monitoring/tracing.js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { JaegerExporter } = require('@opentelemetry/exporter-trace-jaeger');

// Create provider
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'business-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0'
  })
});

// Create exporter
const exporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces'
});

// Add exporter to provider
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

// Register provider
provider.register();

module.exports = provider;
```

### Step 5: Setup Prometheus

**Docker Compose**
```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "5775:5775/udp"
      - "6831:6831/udp"
      - "6832:6832/udp"
      - "5778:5778"
      - "16686:16686"
      - "14268:14268"
      - "9411:9411"
      - "14250:14250"

volumes:
  prometheus-data:
  grafana-data:
```

**Prometheus Configuration**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'business-service'
    static_configs:
      - targets: ['host.docker.internal:3002']
  
  - job_name: 'auth-service'
    static_configs:
      - targets: ['host.docker.internal:3001']
  
  - job_name: 'admin-service'
    static_configs:
      - targets: ['host.docker.internal:3003']
```

### Step 6: Setup Alerting

**Alertmanager Configuration**
```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:5000/alerts'
```

### Step 7: Setup Dashboards

**Import Dashboard to Grafana**
1. Open Grafana (http://localhost:3000)
2. Go to Dashboards → Import
3. Upload dashboard JSON
4. Select Prometheus as data source
5. Save dashboard

---

## Best Practices

### General Best Practices

1. **Start Simple**: Begin with basic monitoring, add complexity as needed
2. **Monitor Everything**: If you can't measure it, you can't improve it
3. **Set Realistic Thresholds**: Avoid alert fatigue with appropriate thresholds
4. **Use Multiple Channels**: Send alerts via multiple channels for critical issues
5. **Review Regularly**: Review and update monitoring configuration regularly
6. **Document Everything**: Document what's monitored and why
7. **Test Alerts**: Test alerting to ensure it works when needed
8. **Learn from Incidents**: Use incidents to improve monitoring
9. **Automate**: Automate monitoring setup and configuration
10. **Share Knowledge**: Share monitoring insights with the team

### Metrics Best Practices

1. **Use Standard Naming**: Follow naming conventions
2. **Label Wisely**: Use labels for dimensions, keep cardinality low
3. **Choose Right Type**: Use counter, gauge, histogram appropriately
4. **Aggregate Carefully**: Use appropriate aggregation functions
5. **Set Buckets Wisely**: Choose histogram buckets carefully
6. **Document Metrics**: Document what each metric means
7. **Review Regularly**: Review and remove unused metrics
8. **Avoid Cardinality Explosion**: Avoid high-cardinality labels
9. **Use Percentiles**: Use percentiles for latency metrics
10. **Track Rates**: Use rates for counter metrics

### Logging Best Practices

1. **Use Structured Logging**: Use JSON format for logs
2. **Include Context**: Include relevant context in logs
3. **Use Appropriate Levels**: Use correct log levels
3. **Avoid Sensitive Data**: Don't log passwords, tokens
4. **Log Errors**: Log errors with stack traces
5. **Log Performance**: Log slow operations
6. **Centralize Logs**: Use centralized log aggregation
7. **Rotate Logs**: Implement log rotation
8. **Monitor Logs**: Monitor log volume and errors
9. **Searchable Logs**: Make logs searchable
10. **Correlate Logs**: Correlate logs with traces

### Alerting Best Practices

1. **Alert on Symptoms**: Alert on user-facing issues
2. **Avoid Alert Fatigue**: Don't alert on everything
3. **Use Severity Levels**: Use appropriate severity levels
4. **Include Context**: Include relevant context in alerts
5. **Set Timeouts**: Use appropriate for durations
6. **Test Alerts**: Test alerting regularly
7. **Escalate Appropriately**: Escalate critical alerts
8. **Document Runbooks**: Document how to respond to alerts
9. **Review Alerts**: Review and update alert rules
10. **Learn from False Positives**: Adjust alerts based on false positives

### Dashboard Best Practices

1. **Show Actionable Data**: Show data that drives action
2. **Keep It Simple**: Don't overcrowd dashboards
3. **Use Consistent Units**: Use consistent units across dashboards
4. **Include Context**: Show trends and comparisons
5. **Use Appropriate Visualizations**: Choose right chart types
6. **Label Clearly**: Use clear labels and titles
7. **Set Time Ranges**: Use appropriate time ranges
8. **Refresh Appropriately**: Set appropriate refresh intervals
9. **Share Dashboards**: Share dashboards with team
10. **Review Regularly**: Review and update dashboards

---

## Quick Reference

### Monitoring Commands

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Check Prometheus
curl http://localhost:9090/metrics

# Check Grafana
open http://localhost:3000

# Check Jaeger
open http://localhost:16686

# View logs
tail -f logs/combined.log
tail -f logs/error.log

# Test alerting
# Trigger an alert by exceeding a threshold
```

### Monitoring Checklist

- [ ] Metrics implemented for all endpoints
- [ ] Structured logging implemented
- [ ] Distributed tracing implemented
- [ ] Prometheus configured
- [ ] Grafana configured
- [ ] Alert rules configured
- [ ] Alert channels configured
- [ ] Dashboards created
- [ ] Documentation updated
- [ ] Team trained on monitoring
