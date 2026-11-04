export default [
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs", "**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "no-console": "off"
    }
  },
  {
    ignores: ["node_modules/**", "dist/**", ".astro/**", "*.config.*"]
  }
];
