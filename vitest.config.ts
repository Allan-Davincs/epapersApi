import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
export default defineConfig({ resolve: { alias: { 'server-only': resolve('tests/server-only.ts'), '@': resolve('src') } }, test: { setupFiles: ['tests/setup.ts'], testTimeout: 30000, hookTimeout: 60000 } });
