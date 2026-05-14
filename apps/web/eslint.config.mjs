import config from '../../packages/eslint-config/base.js';

export default [
  // Ignore config files that are outside the tsconfig include
  {
    ignores: ['tailwind.config.ts', 'postcss.config.mjs'],
  },
  ...config,
  // Next.js App Router files need a local build to produce .next/types before
  // TypeScript can fully resolve next/* subpath imports. Disabling unsafe-*
  // rules avoids false positives when .next/types is absent (CI always has it).
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
];
