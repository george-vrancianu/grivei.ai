// PROTOTYPE (#343), throwaway: never imported by the app's own entry, never built.
// Three variants of the Assistant's chat on the real explorer (fixture data), switchable via ?variant=A|B|C,
// with ?tier=public|private and ?state=answer|checking|empty|quota-low|quota-out|off. Run: `npm run prototype:assistant` in explorer/.
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Box, IconButton, Stack, Typography, UiProvider } from "@grivei/ui";
import { App } from "../App.tsx";
import { AppShell } from "../components/AppShell/index.ts";
import { catalogue } from "../copy/index.ts";
import { fixtureClient } from "../testing/fixtureClient.ts";
import { STATES, type UiState } from "./data.ts";
import { currentEntity, useProto } from "./parts.tsx";
import { NAME as NAME_A, VariantA } from "./VariantA.tsx";
import { AssistantPageB, EntryButtonB, NAME as NAME_B } from "./VariantB.tsx";
import { NAME as NAME_C, VariantC } from "./VariantC.tsx";

const { client } = fixtureClient();
const VARIANTS: [string, string][] = [
  ["A", NAME_A],
  ["B", NAME_B],
  ["C", NAME_C],
];

function Root() {
  const { variant, pathname } = useProto();
  const about = currentEntity(pathname);
  if (variant === "B" && /\/explore\/assistant\/?$/.test(pathname))
    return (
      <UiProvider locale="en">
        <AppShell
          copy={catalogue.en}
          current={null}
          switchTo={{ locale: "ro", href: "#" }}
          links={{ explore: "/explore/", search: "/explore/search", coverage: "/explore/coverage", methodology: "/explore/methodology" }}
        >
          <AssistantPageB />
        </AppShell>
        <Switcher />
      </UiProvider>
    );
  return (
    <>
      <App client={client} />
      <UiProvider locale="en">
        {variant === "A" && <VariantA />}
        {variant === "B" && about && <EntryButtonB entityKey={about.key} name={about.name} />}
        {variant === "C" && <VariantC />}
        <Switcher />
      </UiProvider>
    </>
  );
}

function Switcher() {
  const { variant, tier, state, set } = useProto();
  const at = Math.max(0, VARIANTS.findIndex(([k]) => k === variant));
  const go = (d: number) => set("variant", VARIANTS[(at + d + VARIANTS.length) % VARIANTS.length]![0]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const pill = { bgcolor: "#fff", color: "#111", borderRadius: 99, px: 1, py: 0.5, boxShadow: "0 4px 20px rgba(0,0,0,.5)" };
  const opt = (on: boolean) => ({ cursor: "pointer", px: 1, py: 0.25, borderRadius: 99, fontSize: 12, fontWeight: on ? 700 : 400, bgcolor: on ? "#111" : "transparent", color: on ? "#fff" : "#111" });
  return (
    <Stack direction="row" spacing={1} sx={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 2000, fontFamily: "system-ui, sans-serif" }}>
      <Stack direction="row" sx={{ ...pill, alignItems: "center" }}>
        <IconButton size="small" onClick={() => go(-1)} sx={{ color: "#111" }} aria-label="Previous variant">
          ←
        </IconButton>
        <Typography sx={{ fontSize: 13, fontWeight: 700, px: 1, color: "#111", minWidth: 220, textAlign: "center" }}>
          {VARIANTS[at]![0]} ({VARIANTS[at]![1]})
        </Typography>
        <IconButton size="small" onClick={() => go(1)} sx={{ color: "#111" }} aria-label="Next variant">
          →
        </IconButton>
      </Stack>
      <Stack direction="row" sx={{ ...pill, alignItems: "center" }}>
        {(["public", "private"] as const).map((t) => (
          <Box key={t} sx={opt(tier === t)} onClick={() => set("tier", t)}>
            {t}
          </Box>
        ))}
      </Stack>
      <Stack direction="row" sx={{ ...pill, alignItems: "center" }}>
        {STATES.map((s: UiState) => (
          <Box key={s} sx={opt(state === s)} onClick={() => set("state", s)}>
            {s}
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
