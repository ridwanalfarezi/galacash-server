export default [
  {
    ignores: ["node_modules/", "dist/", ".pnpm-store/", "**/*.d.ts", "logs/", "prisma/"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: false,
        },
      },
    },
    rules: {},
  },
];
