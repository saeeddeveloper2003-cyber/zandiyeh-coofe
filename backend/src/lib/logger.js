/**
 * Minimal centralized logger.
 *
 * Every route/service used to call console.error/console.warn directly with
 * its own ad-hoc message shape, which makes payment failures easy to miss
 * or lose in normal request noise during a production incident. This gives
 * one place (and one JSON shape) for all of that:
 *
 *   logger.error('zarinpal.requestPayment failed', err, { orderId });
 *   logger.warn('sandbox mode enabled');
 *   logger.info('server started', { port });
 *
 * Output is one JSON line per entry on stdout/stderr (easy to grep, and
 * plays nicely with any log aggregator that tails process output). If
 * LOG_FILE is set, entries are additionally appended there — handy for
 * `tail -f` during local debugging of payment issues without digging
 * through general server logs.
 */
const fs = require('fs');

const LOG_FILE = process.env.LOG_FILE;

function serializeError(err) {
  if (!err) return undefined;
  return {
    message: err.message,
    stack: err.stack,
    // zarinpal.js attaches the raw gateway response to errors it throws —
    // surface it here so a failed payment shows *why* Zarinpal rejected it.
    ...(err.zarinpalResponse ? { zarinpalResponse: err.zarinpalResponse } : {}),
  };
}

function write(level, message, meta) {
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...(meta && Object.keys(meta).length ? { meta } : {}),
  };
  const line = JSON.stringify(entry);

  (level === 'error' ? console.error : console.log)(line);

  if (LOG_FILE) {
    try {
      fs.appendFileSync(LOG_FILE, line + '\n');
    } catch (writeErr) {
      // Don't let a broken LOG_FILE path take down logging entirely.
      console.error(JSON.stringify({
        time: new Date().toISOString(),
        level: 'error',
        message: 'logger: failed to write LOG_FILE',
        meta: { error: writeErr.message, LOG_FILE },
      }));
    }
  }
}

module.exports = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, err, meta) => write('error', message, { error: serializeError(err), ...meta }),
};
