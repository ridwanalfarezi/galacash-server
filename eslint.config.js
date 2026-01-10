export default [
  {
    ignores: ['node_modules/', 'dist/', '.pnpm-store/', '**/*.d.ts']
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module'
    },
    rules: {
      'no-unused-vars': 'warn'
    }
  }
];
