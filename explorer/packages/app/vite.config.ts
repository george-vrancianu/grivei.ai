import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The app is served under /explore/ (English) and /ro/explore/ (Romanian) by the same bundle:
// every asset URL is absolute under /explore/assets/, whichever page loads it (Caddy serves both).
export default defineConfig({
  plugins: [react()],
  base: "/explore/",
  build: { outDir: "dist", assetsDir: "assets" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/testing/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
