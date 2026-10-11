import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const app = process.argv[2] || 'epaper-api';
const token = process.env.HEROKU_API_KEY;
if (!token) {
  console.error('Authenticate locally and set HEROKU_API_KEY in this process environment. Never commit or paste the token into chat.');
  process.exit(1);
}
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.heroku+json; version=3', 'Content-Type': 'application/json' };
async function request(path, method = 'GET', body) {
  const response = await fetch(`https://api.heroku.com${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error(`Heroku ${method} failed (HTTP ${response.status}); no credentials were printed.`);
  return response.json();
}
try {
  const apps = await request('/teams/measured2/apps');
  if (!apps.some(item => item.name === app)) throw new Error('The selected app does not belong to team measured2.');
  const info = await request(`/apps/${encodeURIComponent(app)}`);
  const config = parseEnv(readFileSync(new URL('../.env', import.meta.url), 'utf8'));
  for (const key of Object.keys(config)) {
    if (/^(PORT|HEROKU_.*|TEST_.*|BOOTSTRAP_.*|NODE_OPTIONS|EPAPERS_NEXT_DIST_DIR)$/.test(key)) delete config[key];
  }
  config.NODE_ENV = 'production';
  config.NPM_CONFIG_PRODUCTION = 'false'; // Retain tsx for the worker and Prisma for release migrations.
  config.API_ORIGIN = info.web_url.replace(/\/$/, '');
  config.COOKIE_DOMAIN = new URL(info.web_url).hostname;
  await request(`/apps/${encodeURIComponent(app)}/config-vars`, 'PATCH', config);
  console.info(`Uploaded ${Object.keys(config).length} config vars to ${app} in measured2; values were not printed.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Heroku configuration failed');
  process.exitCode = 1;
}
