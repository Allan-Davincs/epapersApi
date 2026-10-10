import ts from 'typescript';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const printer=ts.createPrinter({newLine:ts.NewLineKind.LineFeed});
function format(path){const source=ts.createSourceFile(path,readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true);if(source.parseDiagnostics.length)throw new Error('Cannot format invalid TypeScript');writeFileSync(path,printer.printFile(source));}
function walk(path){for(const entry of readdirSync(path,{withFileTypes:true})){const file=join(path,entry.name);if(entry.isDirectory())walk(file);else if(file.endsWith('.ts'))format(file);}}
for(const path of ['src','app','worker','tests','scripts'])walk(path);
for(const path of ['prisma/seed.ts','instrumentation.ts','vitest.config.ts'])format(path);
