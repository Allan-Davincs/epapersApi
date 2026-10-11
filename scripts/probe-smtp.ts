import { createSmtpTransport } from '../src/lib/email/provider';
import { env } from '../src/lib/env';

async function main() {
    if (env.EMAIL_PROVIDER !== 'smtp') throw new Error('SMTP_NOT_SELECTED');
    const transport = createSmtpTransport();
    try {
        await transport.verify();
        console.info('SMTP connection, TLS and authentication verified. No email was sent.');
    } finally { transport.close(); }
}
main().catch(error => {
    // SMTP responses can contain account information. Print codes only.
    const reason = /certificate|self.signed|unable to verify/i.test(error.message || '') ? 'TLS_CERTIFICATE_ERROR'
        : (error.message || '').match(/\b(?:EACCES|EPERM|ECONNREFUSED|ETIMEDOUT|ENETUNREACH|ENOTFOUND|ECONNRESET)\b/)?.[0];
    console.error('SMTP verification failed:', error.code || (error.message === 'SMTP_NOT_SELECTED' ? error.message : 'CONNECTION_FAILED'), reason || '', error.responseCode || '');
    process.exitCode = 1;
});
