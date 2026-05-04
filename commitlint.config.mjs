// ==============================================================================
// LIC v2 — commitlint (Référentiel §4.17 — Conventional Commits)
// ==============================================================================

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 100],
    "type-enum": [
      2,
      "always",
      [
        "feat",     // nouvelle fonctionnalité
        "fix",      // correction de bug
        "docs",     // documentation seulement
        "style",    // formatage, point-virgules manquants, etc. (pas de changement de code)
        "refactor", // refactoring sans bug ni feature
        "perf",     // amélioration de performance
        "test",     // ajout/correction de tests
        "build",    // build system, dépendances
        "ci",       // CI/CD
        "chore",    // tâches de maintenance
        "revert",   // revert d'un commit
      ],
    ],
    "scope-enum": [
      2, // strict — tout commit avec un scope hors liste est rejeté (aligné type-enum)
      "always",
      [
        // Modules métier
        "client", "licence", "article", "volume", "alert", "notification",
        "renewal", "renouvellement", "audit", "catalog", "team-member", "user",
        "batch", "report", "rapport", "fichier", "settings", "crypto", "sandbox",
        "demo", "email", "error",
        // Infrastructure
        "auth", "db", "env", "infrastructure", "jobs", "logger", "observability",
        "security", "perf",
        // Frontend
        "ui", "components", "hooks", "i18n", "design", "dashboard", "profil",
        // Transverse
        "bootstrap", "deps", "ci", "docs", "config", "release", "debt",
      ],
    ],
  },
};
