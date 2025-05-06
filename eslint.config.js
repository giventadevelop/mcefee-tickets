import nextjs from '@next/eslint-plugin-next';
import js from '@eslint/js';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '.next/**',
      'build/**',
      'dist/**',
      'src/lib/generated/**/*',
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}'],
    plugins: {
      '@next/next': nextjs,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-require-imports': 'warn',
      'no-var': 'warn',
      '@typescript-eslint/no-this-alias': 'off',
      // Add any other rules you want to configure
    }
  }
];