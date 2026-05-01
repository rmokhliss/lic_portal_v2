// ==============================================================================
// LIC v2 — ESLint flat config (Référentiel §4.2)
//
// Règles enforced :
//   - TypeScript strict (pas de `any`, pas de `console.log`, etc.)
//   - eslint-plugin-boundaries : hexagonal strict (domain → application → ports → adapters)
//   - import/order et naming-convention
// ==============================================================================

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import boundaries from "eslint-plugin-boundaries";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // --- Ignore patterns -------------------------------------------------------
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/.turbo/**",
      "**/*.config.{js,mjs,cjs,ts}",
      "**/migrations/**",
    ],
  },

  // --- Base TypeScript -------------------------------------------------------
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  // --- Règles Référentiel S2M (§4.2 + §4.6) ----------------------------------
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        // Backend hexagonal — modules
        { type: "domain", pattern: "app/src/server/modules/*/domain/**" },
        { type: "application", pattern: "app/src/server/modules/*/application/**" },
        { type: "ports", pattern: "app/src/server/modules/*/ports/**" },
        { type: "adapters", pattern: "app/src/server/modules/*/adapters/**" },
        { type: "module-root", pattern: "app/src/server/modules/*/*.module.ts" },

        // Backend infra et jobs
        { type: "infrastructure", pattern: "app/src/server/infrastructure/**" },
        { type: "jobs", pattern: "app/src/server/jobs/**" },

        // Frontend
        { type: "app-route", pattern: "app/src/app/**" },
        { type: "components", pattern: "app/src/components/**" },
        { type: "hooks", pattern: "app/src/hooks/**" },
        { type: "frontend-lib", pattern: "app/src/lib/**" },
        { type: "i18n", pattern: "app/src/i18n/**" },

        // Shared workspace
        { type: "shared", pattern: "shared/src/**" },
      ],
    },
    rules: {
      // --- Règle R1 Référentiel : pas de `any` -------------------------------
      "@typescript-eslint/no-explicit-any": "error",

      // --- Règle R2 Référentiel : pas de console.log -------------------------
      "no-console": ["error", { allow: ["error", "warn"] }],

      // --- Règle R4 Référentiel : pas de new Error() -------------------------
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Error']",
          message:
            "Utiliser les erreurs typées de app/src/server/modules/error/ avec codes SPX-LIC-NNN. Pas de `new Error()`.",
        },
        {
          selector: "ThrowStatement > Literal",
          message: "Pas de `throw 'string'`. Utiliser une erreur typée.",
        },
      ],

      // --- Règle R9 Référentiel : hexagonal strict ---------------------------
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            // domain : aucune dépendance hors TS et shared
            { from: "domain", allow: ["domain", "shared"] },

            // application : peut utiliser domain + ports du même module + shared
            {
              from: "application",
              allow: ["domain", "ports", "shared", "infrastructure"],
            },

            // ports : interfaces pures, peuvent référencer domain et shared
            { from: "ports", allow: ["domain", "shared"] },

            // adapters : implémentent les ports, peuvent tout sauf application directe
            {
              from: "adapters",
              allow: ["domain", "ports", "shared", "infrastructure"],
            },

            // module-root : composition root, peut tout dans son module + infra
            {
              from: "module-root",
              allow: ["domain", "application", "ports", "adapters", "shared", "infrastructure"],
            },

            // infrastructure : plomberie, peut shared
            { from: "infrastructure", allow: ["shared"] },

            // jobs : peuvent appeler les modules via leur module-root + infra + shared
            {
              from: "jobs",
              allow: ["module-root", "application", "infrastructure", "shared"],
            },

            // app-route (Server Actions, pages) : appelle module-root + shared + frontend libs
            {
              from: "app-route",
              allow: [
                "module-root",
                "application",
                "shared",
                "components",
                "hooks",
                "frontend-lib",
                "i18n",
                "infrastructure",
              ],
            },

            // components : peuvent utiliser hooks + shared + autres components + lib + i18n
            {
              from: "components",
              allow: ["components", "hooks", "shared", "frontend-lib", "i18n"],
            },

            // hooks : peuvent utiliser shared + lib + autres hooks
            { from: "hooks", allow: ["hooks", "shared", "frontend-lib"] },

            // frontend-lib : utils frontend, peut shared
            { from: "frontend-lib", allow: ["shared", "frontend-lib"] },

            // i18n : isolé
            { from: "i18n", allow: ["shared"] },

            // shared : aucune dépendance interne au repo
            { from: "shared", allow: [] },
          ],
        },
      ],

      // --- Conventions Référentiel §4.5 --------------------------------------
      "@typescript-eslint/naming-convention": [
        "error",
        // Classes en PascalCase
        { selector: "class", format: ["PascalCase"] },
        // Interfaces en PascalCase, sans préfixe I
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: { regex: "^I[A-Z]", match: false },
        },
        // Types en PascalCase
        { selector: "typeAlias", format: ["PascalCase"] },
        // Fonctions en camelCase
        { selector: "function", format: ["camelCase", "PascalCase"] },
        // Constantes UPPER_SNAKE_CASE ou camelCase
        {
          selector: "variable",
          modifiers: ["const", "global"],
          format: ["UPPER_CASE", "camelCase", "PascalCase"],
        },
      ],

      // --- Qualité générale --------------------------------------------------
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "error",
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",

      // --- Règle Référentiel §4.11 — dossiers interdits dans modules backend
      // services/managers/helpers/utils/common/lib INTERDITS dans
      // app/src/server/modules/<X>/. Toute logique métier doit être
      // dans domain/, application/, ports/, ou adapters/.
      // (lib/ et hooks/ restent autorisés à la racine du frontend, exception §4.11)
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/server/modules/*/services",
                "**/server/modules/*/services/**",
                "**/server/modules/*/managers",
                "**/server/modules/*/managers/**",
                "**/server/modules/*/helpers",
                "**/server/modules/*/helpers/**",
                "**/server/modules/*/utils",
                "**/server/modules/*/utils/**",
                "**/server/modules/*/common",
                "**/server/modules/*/common/**",
                "**/server/modules/*/lib",
                "**/server/modules/*/lib/**",
              ],
              message:
                "Référentiel §4.11 — services/managers/helpers/utils/common/lib INTERDITS dans app/src/server/modules/<X>/. Toute logique va dans domain/, application/, ports/ ou adapters/.",
            },
          ],
        },
      ],
    },
  },

  // --- Désactiver règles qui conflictent avec Prettier (DOIT ÊTRE EN DERNIER)
  prettierConfig,
);
