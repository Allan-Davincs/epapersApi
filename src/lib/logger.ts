import 'server-only';
import pino from 'pino';
import { env } from './env';
const sensitive = /password|hash$|token|otp|secret|apikey|authorization|cookie|fullname|email|url|^r2_|^smtp_|^jwt_|privatekey/i;
export function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value instanceof Error) return { type: value.name, message: '[REDACTED]' };
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, sensitive.test(k) ? '[REDACTED]' : scrub(v)]));
  return value;
}
export function createLogger(destination?: pino.DestinationStream) {
  const options: pino.LoggerOptions = { level: env.LOG_LEVEL, hooks: { logMethod(args, method) { if (typeof args[0] === 'object') args[0] = scrub(args[0]) as object; method.apply(this, args); } } };
  return destination ? pino(options, destination) : pino(options);
}
export const logger = createLogger();
