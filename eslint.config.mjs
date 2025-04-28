import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  // Add your custom rules here
  {
    rules: {
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "warn",
      "no-console": "off",
      "no-unused-vars": "warn",
      "quotes": "off",
      "semi": "off",
      "indent": "off",
      "prefer-arrow-callback": "off",
      "prefer-const": "warn",
      "react/no-unescaped-entities": "off"
    }
  }
];

export default eslintConfig;
