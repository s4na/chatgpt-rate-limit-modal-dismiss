import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["content.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        MutationObserver: "readonly"
      }
    }
  },
  {
    files: ["eslint.config.js", "test/**/*.js"]
  },
  {
    ignores: ["node_modules/"]
  }
]);
