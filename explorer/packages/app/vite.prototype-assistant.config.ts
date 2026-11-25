// PROTOTYPE (#343), throwaway: serves the real app on fixtures with the Assistant variants on top.
// Every /explore/* page load gets prototype-assistant.html instead of index.html.
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const prototypeHtml: Plugin = {
  name: "prototype-assistant-html",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url ?? "";
      const isPage = (req.headers.accept ?? "").includes("text/html") && !url.includes(".");
      if (isPage && (url.startsWith("/explore") || url.startsWith("/ro/explore"))) req.url = "/explore/prototype-assistant.html";
      next();
    });
  },
};

export default defineConfig({ plugins: [prototypeHtml, react()], base: "/explore/", server: { port: 5199 } });
