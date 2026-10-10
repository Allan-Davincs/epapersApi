import 'server-only';
import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie',
      'password', 'passwordHash', 'token', 'refreshToken', 'accessToken', 'otp',
      'secret', 'apiKey', 'authorization', 'cookie', 'fullName', 'email',
      'DATABASE_URL', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'SMTP_PASSWORD',
      'SMTP_USER', 'RESEND_API_KEY', 'JWT_ACCESS_SECRET', 'REFRESH_TOKEN_PEPPER',
      'IP_HASH_SALT', 'TURNSTILE_SECRET', '*.url',
    ],
    censor: '[REDACTED]',
    remove: false,
  },
  serializers: {
    err: pino.stdSerializers.err,
  },
});
