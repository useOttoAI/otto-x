const SERVICE = 'otto-x';

type LogLevel = 'info' | 'warn' | 'error';

function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    service: SERVICE,
    level,
    message,
    ...data,
  };
  const method = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  method(JSON.stringify(entry));
}

export const logger = {
  info: (msg: string, data?: Record<string, unknown>): void => log('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>): void => log('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>): void => log('error', msg, data),
};
