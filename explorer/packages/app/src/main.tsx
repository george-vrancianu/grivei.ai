import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { localeFromPath } from "./locale.ts";

const path = window.location.pathname;
document.documentElement.lang = localeFromPath(path);
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App path={path} />
  </StrictMode>,
);
