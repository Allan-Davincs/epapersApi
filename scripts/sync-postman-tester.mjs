import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

// js-yaml is already included by the locked ESLint toolchain.
const { load, dump } = createRequire(import.meta.url)('js-yaml');
const destination = resolve('../Apitester');
const collection = JSON.parse(readFileSync('postman.json', 'utf8'));
const template = JSON.parse(readFileSync('postman/epapers.environment.json', 'utf8'));
const collectionDirectory = join(destination, 'postman/collections', collection.info.name);
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]);
}
const requests = collection.item.flatMap(folder => folder.item);
const byName = new Map(requests.map(item => [item.name, item]));
const localFiles = files(collectionDirectory).filter(file => file.endsWith('.request.yaml'));
const localRequests = localFiles.map(file => ({ file, local: load(readFileSync(file, 'utf8')) }));
const localNames = new Set(localRequests.map(({ file, local }) => local.name || basename(file, '.request.yaml')));
for (const folder of collection.item) {
  for (const [index, item] of folder.item.entries()) {
    if (localNames.has(item.name)) continue;
    const filename = item.name.replaceAll('/', '-').replaceAll('{', '').replaceAll('}', '') + '.request.yaml';
    const file = join(collectionDirectory, folder.name, filename);
    assert.ok(!existsSync(file), 'New request would overwrite an existing file: ' + item.name);
    localRequests.push({ file, local: { $kind: 'http-request', name: item.name, order: (index + 1) * 1000 } });
  }
}
const updates = [];
const seen = new Set();
for (const { file, local } of localRequests) {
  const name = local.name || basename(file, '.request.yaml');
  const item = byName.get(name);
  assert.ok(item, 'Unknown Local View request: ' + name);
  assert.ok(!seen.has(name), 'Duplicate Local View request: ' + name);
  seen.add(name);
  const request = item.request;
  const output = { ...local, name, description: request.description, url: typeof request.url === 'string' ? request.url : request.url.raw, method: request.method };
  output.headers = Object.fromEntries((request.header || []).filter(header => !header.disabled).map(header => [header.key, header.value]));
  if (request.url.query) output.queryParams = request.url.query.map(query => ({ key: query.key, value: query.value, disabled: !!query.disabled }));
  else delete output.queryParams;
  if (request.body?.mode === 'raw') output.body = { type: 'json', content: request.body.raw };
  else if (request.body?.mode === 'file') output.body = { type: 'file', content: local.body?.content || {} };
  else delete output.body;
  output.auth = request.auth?.type === 'bearer' ? { type: 'bearer', credentials: { token: request.auth.bearer.find(value => value.key === 'token').value } } : { type: 'noauth' };
  output.scripts = (item.event || []).map(event => ({ type: event.listen === 'prerequest' ? 'beforeRequest' : 'afterResponse', code: event.script.exec.join('\n'), language: 'text/javascript' }));
  updates.push([file, dump(output, { lineWidth: -1, noRefs: true })]);
}
const definitionFile = join(collectionDirectory, '.resources/definition.yaml');
const definition = load(readFileSync(definitionFile, 'utf8'));
definition.description = collection.info.description.replace('docs/POSTMAN.md', 'postman/documents/postman.md');
definition.variables = { ...definition.variables, ...Object.fromEntries(collection.variable.map(variable => [variable.key, variable.value])) };
updates.push([definitionFile, dump(definition, { lineWidth: -1, noRefs: true })]);

const environmentFile = join(destination, 'postman/environments/epapers.environment.json');
// The old .json file contained YAML; output valid JSON (also valid YAML) for both importers.
const existing = load(readFileSync(environmentFile, 'utf8'));
const existingValues = new Map((existing.values || []).map(value => [value.key, value]));
const obsolete = key => /turnstile|adminTotp/i.test(key);
const values = template.values.map(value => ({ ...value, ...existingValues.get(value.key) }));
for (const [key, value] of existingValues) if (!obsolete(key) && !values.some(item => item.key === key)) values.push(value);
updates.push([environmentFile, JSON.stringify({ ...existing, name: existing.name || template.name, values, _postman_variable_scope: 'environment' }, null, 2) + '\n']);
const guide = readFileSync('docs/POSTMAN.md', 'utf8')
  .replaceAll('EpapersApi/postman.json', 'Apitester/postman.json')
  .replaceAll('EpapersApi/postman/epapers.environment.json', 'Apitester/postman/environments/epapers.environment.json');
updates.push([join(destination, 'postman/documents/postman.md'), guide]);
updates.push([join(destination, 'postman.json'), JSON.stringify(collection, null, 2) + '\n']);
// Validate everything before writing any file; preserve names, orders and workspace IDs.
for (const [file, content] of updates) {
  if (file.endsWith('.yaml')) load(content);
  if (file.endsWith('.json')) JSON.parse(content);
}
for (const [file, content] of updates) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, content); }
console.info(`Updated ${requests.length} Local View requests, collection schemas, import JSON, guide and environment. Existing environment values preserved; no HTTP requests sent.`);
