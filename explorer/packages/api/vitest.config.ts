import { defineConfig } from "vitest/config";

// The seam-1 test starts a container and loads the archive: give it room.
export default defineConfig({ test: { include: ["src/**/*.test.ts", "test/**/*.test.ts"], testTimeout: 30_000, hookTimeout: 180_000 } });
