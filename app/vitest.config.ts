import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
    // F-07 : sérialiser les fichiers de tests pour éviter les conflits sur la
    // BD partagée (bootstrap-admin, change-password, audit.recorder, migration).
    // fileParallelism:false (vs singleFork) préserve l'isolation des mocks
    // par fichier — chaque fichier tourne dans son propre worker. Coût
    // négligeable à l'échelle LIC. Refactor F-13 (durcissement) si besoin.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Référentiel §4.6 : seuil ≥80% sur les couches métier uniquement.
      // Adapters et infrastructure sont testés en intégration (couverture
      // mesurée différemment, sans seuil de ligne strict).
      include: ["src/server/modules/*/domain/**", "src/server/modules/*/application/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    // Format tableau (ordonné). Plus spécifique d'abord : `@/shared/*` DOIT matcher
    // avant `@/*` pour éviter que Vite résolve `@/shared/foo` vers `app/src/shared/foo`.
    // Conserve la cohérence avec les paths TypeScript de app/tsconfig.json.
    alias: [
      {
        find: /^@\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, "../shared/src/$1"),
      },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, "src/$1") },
    ],
  },
});
