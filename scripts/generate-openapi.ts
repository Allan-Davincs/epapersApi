import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { schemas, responseSchemas } from '../src/modules/auth/schemas';
import { addPhasePaths } from './phase-openapi';
import { addAdminPaths } from './admin-openapi';
const definitions:Record<string,unknown> = Object.fromEntries(Object.entries(schemas).map(([key, schema]) => ['auth_' + key, z.toJSONSchema(schema, { io: 'input' })]));
const mapping: Record<string, [
    string,
    string,
    boolean
]> = { reauth: ['POST', 'reauth', true], register: ['POST', 'register', false], login: ['POST', 'login', false], 'admin/login': ['POST', 'adminLogin', false], 'verify-email': ['POST', 'verifyOtp', false], 'verification/resend': ['POST', 'resend', false], 'forgot-password': ['POST', 'forgot', false], 'reset-password': ['POST', 'reset', false], refresh: ['POST', 'empty', false], logout: ['POST', 'empty', false], 'logout-all': ['POST', 'empty', true], me: ['GET', 'empty', true], 'username-availability': ['GET', 'availability', false] };
const paths: Record<string, unknown> = {};
Object.assign(definitions, Object.fromEntries(Object.entries(responseSchemas).map(([key, schema]) => [key, z.toJSONSchema(schema)])));
function success(schema: string) { return { description: 'Success', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/' + schema } }, required: ['data'], additionalProperties: false } } } }; }
for (const [path, [method, schema, auth]] of Object.entries(mapping))
    paths['/auth/' + path] = { [method.toLowerCase()]: { security: auth ? [{ bearerAuth: [] }] : [], ...(method === 'GET' ? { parameters: schema === 'availability' ? [{ name: 'username', in: 'query', required: true, schema: { type: 'string', minLength: 3, maxLength: 30 } }] : [] } : { requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/auth_' + schema } } } }, parameters: [{ name: 'X-EPapers-Client', in: 'header', required: true, schema: { type: 'string', const: 'web' } }] }), responses: { '200': success(['login', 'admin/login', 'refresh'].includes(path) ? 'tokens' : path === 'reauth' ? 'reauth' : path === 'me' ? 'profile' : path === 'username-availability' ? 'availability' : 'message'), '401': { description: 'Authentication required' }, '403': { description: 'Forbidden or invalid origin' }, '409': { description: 'Conflict' }, '422': { description: 'Invalid request' }, '429': { description: 'Rate limited' } } } };
paths['/users/me'] = { patch: { security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/auth_profile' } } } }, responses: { '200': success('profile'), '409': { description: 'Username unavailable or cooldown' } } } };
paths['/users/me/sessions'] = { get: { security: [{ bearerAuth: [] }], responses: { '200': success('sessionList') } } };
paths['/users/me/sessions/{id}'] = { delete: { security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { '200': success('message'), '404': { description: 'Session not found' } } } };
paths['/health'] = { get: { responses: { '200': { description: 'Database healthy' }, '503': { description: 'Database unavailable' } } } };
const aliases: Record<string,string> = {
    '/auth/verify-otp':'/auth/verify-email',
    '/auth/resend-otp':'/auth/verification/resend',
    '/auth/sessions':'/users/me/sessions',
    '/auth/sessions/{id}':'/users/me/sessions/{id}'
};
for (const [alias,canonical] of Object.entries(aliases)) paths[alias]=structuredClone(paths[canonical]);
const refreshOperation=(paths['/auth/refresh'] as {post:Record<string,unknown>}).post;
refreshOperation.security=[{refreshCookie:[]}];
for (const [path, item] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(item as Record<string, Record<string, unknown>>)) {
        if (['post', 'patch', 'delete'].includes(method)) {
            const parameters = (operation.parameters || []) as Array<{
                name: string;
            }>;
            if (!parameters.some(p => p.name === 'X-EPapers-Client'))
                parameters.push({ name: 'X-EPapers-Client', in: 'header', required: true, schema: { type: 'string', const: 'web' } } as unknown as {
                    name: string;
                });
            operation.parameters = parameters;
        }
        if (path !== '/health') {
            const responses = operation.responses as Record<string, Record<string, unknown>>;
            for (const [status, response] of Object.entries(responses))
                if (Number(status) >= 400)
                    response.content = { 'application/json': { schema: { $ref: '#/components/schemas/error' } } };
        }
    }
}
addPhasePaths(paths,definitions);
addAdminPaths(paths,definitions);
writeFileSync('docs/openapi.yaml', JSON.stringify({ openapi: '3.1.0', info: { title: 'EPapers API', version: '1.0.0' }, servers: [{ url: '/api/v1' }], paths, components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, refreshCookie: {type:'apiKey',in:'cookie',name:'epapers_refresh'} }, schemas: definitions } }, null, 2) + '\n');
