import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    rules: {
      "no-undef": "error",
      "no-unused-vars": "error"
    }
  },
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
    files: ["eslint.config.js", "test/**/*.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        process: "readonly",
        setTimeout: "readonly"
      }
    }
  },
  {
    ignores: ["node_modules/"]
  }
]);
