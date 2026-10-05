import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['**/dist/**', 'node_modules/**', 'release/**', 'artifacts/**'] },
  ...tseslint.configs.recommended,
  { files: ['**/*.ts'], rules: { '@typescript-eslint/no-explicit-any': 'error' } },
  { files: ['**/*.mjs'], languageOptions: { globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', URL: 'readonly' } } }
);
