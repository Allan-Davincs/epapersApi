import js from '@eslint/js';
import parser from '@typescript-eslint/parser';
import ts from '@typescript-eslint/eslint-plugin';
export default [
 {ignores:['.next/**','.next-connection-test/**','node_modules/**','next-env.d.ts','.npm-cache/**']},
 js.configs.recommended,
 {languageOptions:{globals:{process:'readonly',console:'readonly',Buffer:'readonly',URL:'readonly',setTimeout:'readonly',fetch:'readonly',AbortSignal:'readonly',crypto:'readonly',Headers:'readonly'}}},
 {files:['**/*.ts','**/*.tsx'],languageOptions:{parser},plugins:{'@typescript-eslint':ts},rules:{...ts.configs.recommended.rules,'no-undef':'off','no-unused-vars':'off','@typescript-eslint/no-unused-vars':['warn',{argsIgnorePattern:'^_'}]}}
];
