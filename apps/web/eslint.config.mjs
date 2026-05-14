import config from '../../packages/eslint-config/base.js';
import globals from 'globals';

export default [
  {
    ignores: ['tailwind.config.ts', 'postcss.config.mjs'],
  },
  ...config,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      // Next.js App Router files need a local build to produce .next/types before
      // TypeScript can fully resolve next/* subpath imports.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
];
