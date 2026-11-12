import { defineConfig } from "vitest/config";

// Root-level tests for repo tooling (lint boundary). Packages have their own vitest config.
export default defineConfig({ test: { include: ["tooling/**/*.test.ts"] } });
