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
        // module-schema DOIT être déclaré AVANT "adapters" pour avoir priorité
        // de matching (eslint-plugin-boundaries : le premier match gagne).
        // Surface publique cross-module d'un adapter Postgres : seul fichier qui
        // peut être importé depuis d'autres modules. Le reste de l'adapter
        // (repository.pg.ts, mapper.ts) reste privé au module.
        {
          type: "module-schema",
          pattern: "app/src/server/modules/*/adapters/postgres/schema.ts",
        },

        // Backend hexagonal — modules
        { type: "domain", pattern: "app/src/server/modules/*/domain/**" },
        { type: "application", pattern: "app/src/server/modules/*/application/**" },
        { type: "ports", pattern: "app/src/server/modules/*/ports/**" },
        { type: "adapters", pattern: "app/src/server/modules/*/adapters/**" },
        { type: "module-root", pattern: "app/src/server/modules/*/*.module.ts" },

        // Module transverse error — structure plate (pas de domain/application/ports/adapters).
        // Importable par toutes les couches serveur (PROJECT_CONTEXT §7).
        { type: "module-error", pattern: "app/src/server/modules/error/**" },

        // Next.js 16 instrumentation hook (boot Node runtime, exécuté UNE fois).
        { type: "instrumentation", pattern: "app/src/instrumentation.ts" },

        // Next.js middleware (Edge runtime). Point d'entrée routage avant les
        // pages : check session Auth.js + détection locale next-intl.
        { type: "middleware", pattern: "app/src/middleware.ts" },

        // Composition root : SEUL fichier autorisé à câbler les modules cross-module.
        // Garde les <X>.module.ts fermés (DI intra-module uniquement) et rend le
        // graphe de dépendances cross-module auditable en un seul endroit.
        {
          type: "composition-root",
          pattern: "app/src/server/composition-root.ts",
        },

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
            // domain : aucune dépendance hors TS, shared et erreurs typées
            { from: "domain", allow: ["domain", "shared", "module-error"] },

            // application : peut utiliser domain + ports du même module + shared + erreurs typées
            {
              from: "application",
              allow: ["domain", "ports", "shared", "infrastructure", "module-error"],
            },

            // ports : interfaces pures, peuvent référencer domain, shared et erreurs typées
            { from: "ports", allow: ["domain", "shared", "module-error"] },

            // adapters : implémentent les ports + lisent les contrats schema.ts
            // (le leur et celui d'autres modules pour les JOIN cross-module).
            // module-schema est la seule "surface publique" cross-adapters
            // (cf. F-06 décision module-schema chirurgical) — le reste des
            // adapters reste privé au module. Note F-07 reprise à F-08.
            {
              from: "adapters",
              allow: [
                "domain",
                "ports",
                "shared",
                "infrastructure",
                "module-error",
                "module-schema",
              ],
            },

            // module-root : composition root, peut tout dans son module + infra + erreurs
            {
              from: "module-root",
              allow: [
                "domain",
                "application",
                "ports",
                "adapters",
                "shared",
                "infrastructure",
                "module-error",
              ],
            },

            // infrastructure : plomberie, peut shared + autres briques infrastructure + erreurs.
            // Les briques infrastructure (env, logger, db, auth, observability) se composent
            // entre elles : logger lit env.LOG_LEVEL, db lit env.DATABASE_URL, etc.
            // Cette autorisation est différente du fourre-tout services/helpers/utils
            // interdit par §4.11 dans les modules métier.
            {
              from: "infrastructure",
              allow: ["shared", "infrastructure", "module-error", "module-schema"],
            },

            // module-error : module transverse, ne dépend que du catalogue dans shared/.
            // N'importe JAMAIS infrastructure/env/ ni infrastructure/logger/ pour
            // éviter tout cycle de bootstrap (l'app peut lever une AppError très tôt).
            { from: "module-error", allow: ["shared"] },

            // instrumentation : boot hook Next.js, peut appeler les helpers infra
            // (bootstrapAdmin, init OTel futur, etc.) + erreurs typées + shared.
            // N'importe PAS les modules métier directement — passer par
            // composition-root pour ça.
            {
              from: "instrumentation",
              allow: ["infrastructure", "module-error", "shared"],
            },

            // middleware : point d'entrée routage Next.js (Edge runtime).
            // Importe auth() depuis infrastructure/auth (décode JWT cookie,
            // pas d'appel BD — compatible Edge). N'importe PAS les modules
            // métier (pas de logique métier dans le middleware).
            {
              from: "middleware",
              allow: ["infrastructure", "module-error", "shared"],
            },

            // composition-root : SEUL autorisé à voir tous les <X>.module.ts.
            // Câble les use-cases cross-module et expose des singletons prêts
            // à consommer (ex: changePasswordUseCase). Les modules eux-mêmes
            // restent fermés à toute composition cross-module.
            {
              from: "composition-root",
              allow: [
                "module-root",
                "application",
                "ports",
                "infrastructure",
                "module-error",
                "shared",
              ],
            },

            // module-schema : surface publique cross-module d'un adapter Postgres.
            // Importe : shared (constants/types), infrastructure (helpers columns.ts),
            // module-error (erreurs typées éventuelles) et OTHER module-schema (FK
            // cross-module — c'est précisément le point de définir ce type séparé).
            // À F-07+, étendre `from: adapters` avec module-schema quand un repository
            // fera des JOIN cross-module (note de processus, pas d'anticipation ici).
            {
              from: "module-schema",
              allow: ["shared", "infrastructure", "module-error", "module-schema"],
            },

            // jobs : peuvent appeler les modules via leur module-root + infra + shared + erreurs
            {
              from: "jobs",
              allow: [
                "module-root",
                "application",
                "infrastructure",
                "shared",
                "module-error",
              ],
            },

            // app-route (Server Actions, pages) : DOIT passer par composition-root
            // pour atteindre les use-cases câblés. Pas d'accès direct aux
            // module-root ni aux application/ — pattern strict (cf. F-07 décision).
            {
              from: "app-route",
              allow: [
                "composition-root",
                "shared",
                "components",
                "hooks",
                "frontend-lib",
                "i18n",
                "infrastructure",
                "module-error",
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
