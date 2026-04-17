/**
 * Cloud Logging — SmartVenue AI
 * Structured JSON logging that writes to stdout (always) and to
 * Google Cloud Logging when running in production on Cloud Run.
 *
 * Cloud Run automatically ingests stdout JSON as structured log entries
 * when they follow the LogEntry format, so we don't need the SDK for
 * basic structured logs. We use the SDK for explicit log writes (e.g.
 * creating audit log entries for operator actions).
 */

const IS_PROD = process.env.NODE_ENV === 'production';
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;

// Severity levels aligned with Cloud Logging
const SEVERITY = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  NOTICE: 'NOTICE',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
};

function write(severity, message, labels = {}) {
  const entry = {
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...labels,
    ...(IS_PROD && PROJECT_ID ? {
      // Cloud Run injects these automatically but being explicit helps
      'logging.googleapis.com/labels': {
        service: 'smartvenue-ai',
        project: PROJECT_ID,
        ...labels,
      },
    } : {}),
  };

  // Cloud Run reads structured JSON from stdout
  if (IS_PROD) {
    process.stdout.write(JSON.stringify(entry) + '\n');
  } else {
    // Pretty print locally
    const color = {
      DEBUG: '\x1b[36m', INFO: '\x1b[32m', NOTICE: '\x1b[34m',
      WARNING: '\x1b[33m', ERROR: '\x1b[31m', CRITICAL: '\x1b[35m',
    }[severity] || '';
    console.log(`${color}[${severity}]\x1b[0m ${message}`, Object.keys(labels).length ? labels : '');
  }
}

export const logger = {
  debug: (msg, labels) => write(SEVERITY.DEBUG, msg, labels),
  info: (msg, labels) => write(SEVERITY.INFO, msg, labels),
  notice: (msg, labels) => write(SEVERITY.NOTICE, msg, labels),
  warn: (msg, labels) => write(SEVERITY.WARNING, msg, labels),
  error: (msg, labels) => write(SEVERITY.ERROR, msg, labels),
  critical: (msg, labels) => write(SEVERITY.CRITICAL, msg, labels),

  /** Log an operator action as a NOTICE-level audit entry */
  audit: (action, { operator = 'system', target = '', metadata = {} } = {}) =>
    write(SEVERITY.NOTICE, `AUDIT: ${action}`, { operator, target, ...metadata }),
};
