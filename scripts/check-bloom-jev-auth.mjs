import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const harness = await fs.readFile(new URL('../lib/bloom/jev-harness.mjs', import.meta.url), 'utf8');
const refresh = await fs.readFile(new URL('../pages/api/bloom-refresh.js', import.meta.url), 'utf8');
const pkg = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8'));

assert.equal(pkg.dependencies?.['@vercel/oidc'], '3.8.8', 'Bloom JEV must declare the same request-scoped Vercel OIDC helper used by established tool engines');
assert.match(harness, /getVercelOidcToken/, 'JEV client must acquire the Vercel OIDC token from request context');
assert.match(harness, /import\(['"]@vercel\/oidc['"]\)/, 'OIDC helper must stay server-side and dynamically loaded');
assert.doesNotMatch(harness, /process\.env\.VERCEL_OIDC_TOKEN/, 'JEV client must not manually read the rotating Vercel OIDC token');
assert.doesNotMatch(refresh, /process\.env\.VERCEL_OIDC_TOKEN/, 'refresh route must not manually pass the rotating Vercel OIDC token');
assert.doesNotMatch(refresh, /x-vercel-oidc-token/i, 'refresh route should let @vercel/oidc read request context rather than manually plumbing the header');

console.log('Bloom JEV OIDC checks passed.');
