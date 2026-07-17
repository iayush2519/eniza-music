// Shared ESLint flat config base, extended by every app/package.
// @ts-check
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // eslint-plugin-react-hooks's own "recommended-latest"/"flat" exports
  // still use the legacy plugins:["react-hooks"] string-array shape, which
  // ESLint's flat config format rejects. Reconstructed manually here in
  // the correct plugins:{object} shape using the same rule set.
  {
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs["recommended-latest"].rules
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.expo/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/android/**",
      "**/ios/**"
    ]
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }]
    }
  }
];

export default baseConfig;
