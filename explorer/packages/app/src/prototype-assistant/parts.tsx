// PROTOTYPE (#343), throwaway. Small pieces the three variants share: URL state, the composer, the tier/state notices.
// Layout and the way citations show are each variant's own (see VariantA/B/C).
import { useSyncExternalStore, type ReactNode } from "react";
import { Box, Button, Stack, TextField, Typography, Link } from "@grivei/ui";
import { navigate } from "../routing/location.tsx";
import { refHref, type Tier, type UiState } from "./data.ts";

// history.pushState/replaceState don't fire events; wrap them once so the prototype sees every URL change the app makes.
const EVT = "prototype-url";
for (const m of ["pushState", "replaceState"] as const) {
  const orig = window.history[m].bind(window.history);
  window.history[m] = (...args: Parameters<History["pushState"]>) => {
    orig(...args);
    window.dispatchEvent(new Event(EVT));
  };
}
const subscribe = (cb: () => void) => {
  window.addEventListener(EVT, cb);
  window.addEventListener("popstate", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("popstate", cb);
  };
};
const snap = () => window.location.href;

export interface ProtoParams {
  variant: string;
  tier: Tier;
  state: UiState;
  pathname: string;
  set: (key: string, value: string) => void;
}

export function useProto(): ProtoParams {
  const href = useSyncExternalStore(subscribe, snap);
  const url = new URL(href);
  const p = url.searchParams;
  return {
    variant: p.get("variant") ?? "A",
    tier: (p.get("tier") as Tier) ?? "public",
    state: (p.get("state") as UiState) ?? "answer",
    pathname: url.pathname,
    set: (key, value) => {
      const next = new URL(window.location.href);
      next.searchParams.set(key, value);
      navigate(next.pathname + next.search + next.hash, "replace");
    },
  };
}

/** The entity the page is showing, when it is an entity page: the Assistant's starting context. */
export function currentEntity(pathname: string): { role: string; key: string; name: string } | null {
  const m = pathname.match(/\/explore\/(supplier|authority)\/([^/]+)/);
  if (!m) return null;
  return { role: m[1]!, key: m[2]!, name: m[2] === "2000007" ? "ALFA DEMO SRL" : m[2] === "1000017" ? "SPITALUL EXEMPLU" : `entity ${m[2]}` };
}

/** A link inside an answer: follows in-app without a page load, like every link in the explorer. */
export function AppHref({ href, children, sx }: { href: string; children: ReactNode; sx?: object }) {
  return (
    <Link
      href={href}
      sx={sx}
      onClick={(e: React.MouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || href.startsWith("http")) return;
        e.preventDefault();
        navigate(href);
      }}
      {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </Link>
  );
}
export { refHref };

export const LABEL_SX = { fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "graf.muted" };

/** The question box. Disabled with a reason in the quota-out and off states. */
export function Composer({ state, tier, placeholder, dense = false }: { state: UiState; tier: Tier; placeholder: string; dense?: boolean }) {
  const blocked = tier === "public" && (state === "quota-out" || state === "off");
  return (
    <Stack spacing={0.75}>
      <Stack sx={{ alignItems: "flex-end" }} direction="row" spacing={1}>
        <TextField
          fullWidth
          multiline
          maxRows={5}
          size={dense ? "small" : "medium"}
          placeholder={blocked ? "The Assistant can't take questions right now" : placeholder}
          disabled={blocked || state === "checking"}
        />
        <Button variant="contained" disabled={blocked || state === "checking"}>
          Ask
        </Button>
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ color: "graf.muted" }}>
        {tier === "private" ? (
          <>
            <Typography sx={LABEL_SX}>Private view</Typography>
            <Typography sx={LABEL_SX}>· web search on request</Typography>
            <Typography sx={LABEL_SX}>· conversation kept</Typography>
          </>
        ) : (
          <>
            <Typography sx={LABEL_SX}>{state === "quota-low" ? "2 of 10 questions left today" : state === "quota-out" || state === "off" ? "0 questions left" : "7 of 10 questions left today"}</Typography>
            <Typography sx={LABEL_SX}>· not kept</Typography>
          </>
        )}
      </Stack>
    </Stack>
  );
}

/** What the public tier says when it can't answer. Private view has only the budget-off state. */
export function StateNotice({ state, tier }: { state: UiState; tier: Tier }) {
  if (state === "quota-out" && tier === "public")
    return (
      <Notice title="You've used today's 10 questions">
        The Assistant is free and has a daily limit per visitor. It resets at midnight, Bucharest time. You can still explore everything it would have looked up: search, the entity pages, the Records.
      </Notice>
    );
  if (state === "off")
    return (
      <Notice title="The Assistant is off until midnight">
        {tier === "public"
          ? "It has a fixed daily budget, and today's is spent. It comes back at midnight, Bucharest time. The explorer itself works as usual."
          : "The Private view's daily budget ($5) is spent. It comes back at midnight, Bucharest time."}
      </Notice>
    );
  if (state === "quota-low" && tier === "public")
    return (
      <Typography variant="body2" sx={{ color: "graf.text2" }}>
        2 questions left today. It resets at midnight, Bucharest time.
      </Typography>
    );
  return null;
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box sx={{ border: 1, borderColor: "graf.lineStrong", borderRadius: 1, p: 2, bgcolor: "graf.panel" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: "graf.text2" }}>
        {children}
      </Typography>
    </Box>
  );
}

/** "Checking sources" placeholder: the answer exists but is held back until its citations are checked. */
export function Checking({ toolCalls = 4 }: { toolCalls?: number }) {
  return (
    <Stack spacing={1} sx={{ color: "graf.muted" }}>
      <Typography sx={LABEL_SX}>Looked up {toolCalls} things in the graph · checking every source…</Typography>
      {[92, 80, 64].map((w) => (
        <Box key={w} sx={{ height: 10, width: `${w}%`, bgcolor: "graf.line", borderRadius: 0.5 }} />
      ))}
    </Stack>
  );
}

export const DISCLAIMER =
  "Answers come only from Records, entities and documents in our data, and every claim links to its source. Leads are patterns worth verifying, not findings.";
