import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["src/**/*.spec.ts", "src/**/*.test.ts"],
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
