// PROTOTYPE (#343), throwaway. Variant A: a chat panel docked on the right of the entity page, starting from the entity on screen.
// Citations: entity names are links in the prose; other claims carry numbered markers that point into a Sources list under each answer.
import { useEffect, useState, type ReactNode } from "react";
import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from "@grivei/ui";
import { AppHref, Checking, Composer, currentEntity, DISCLAIMER, LABEL_SX, StateNotice, useProto } from "./parts.tsx";
import { CONVERSATION, PRIVATE_CONVERSATION, refHref, refId, refLabel, SUGGESTIONS, type Block, type Message, type Ref, type Seg } from "./data.ts";

export const NAME = "Docked panel";
const WIDTH = 440;

export function VariantA() {
  const { tier, state, pathname } = useProto();
  const [open, setOpen] = useState(true);
  const about = currentEntity(pathname);
  useEffect(() => {
    document.body.style.marginRight = open ? `${WIDTH}px` : "";
    return () => {
      document.body.style.marginRight = "";
    };
  }, [open]);

  if (!open)
    return (
      <Button variant="contained" onClick={() => setOpen(true)} sx={{ position: "fixed", right: 24, bottom: 88, zIndex: 1300 }}>
        Ask the Assistant
      </Button>
    );

  const messages = tier === "private" ? PRIVATE_CONVERSATION : CONVERSATION;
  const blocked = tier === "public" && (state === "quota-out" || state === "off");
  return (
    <Box
      component="aside"
      aria-label="Assistant"
      sx={{ position: "fixed", top: 0, right: 0, bottom: 0, width: WIDTH, zIndex: 1250, bgcolor: "graf.panel", borderLeft: 1, borderColor: "graf.line", display: "flex", flexDirection: "column" }}
    >
      <Stack direction="row" sx={{ alignItems: "center", px: 2, py: 1.5, borderBottom: 1, borderColor: "graf.line" }} spacing={1}>
        <Typography variant="h3" sx={{ fontSize: 18, flex: 1 }}>
          Assistant
        </Typography>
        {tier === "private" && state !== "empty" && <Button size="small">Export</Button>}
        <IconButton aria-label="Close the Assistant" onClick={() => setOpen(false)} size="small">
          ✕
        </IconButton>
      </Stack>
      {about && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", px: 2, py: 1, borderBottom: 1, borderColor: "graf.line" }}>
          <Typography sx={LABEL_SX}>Starting from</Typography>
          <Chip size="small" variant="outlined" label={about.name} />
        </Stack>
      )}
      <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 2 }}>
        <Stack spacing={2.5}>
          {state === "empty" || state === "off" || state === "quota-out" ? (
            <Empty about={about?.name ?? null} blocked={blocked} />
          ) : (
            messages.map((m, i) => (i === messages.length - 1 && state === "checking" && m.role === "assistant" ? <Checking key={i} /> : <Turn key={i} m={m} />))
          )}
          <StateNotice state={state} tier={tier} />
        </Stack>
      </Box>
      <Box sx={{ p: 2, borderTop: 1, borderColor: "graf.line" }}>
        <Composer state={state} tier={tier} placeholder={about ? `Ask about ${about.name}…` : "Ask about public procurement…"} dense />
        {!blocked && (
          <Typography variant="caption" component="p" sx={{ color: "graf.muted", mt: 1 }}>
            {DISCLAIMER}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function Empty({ about, blocked }: { about: string | null; blocked: boolean }) {
  if (blocked) return null;
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" sx={{ color: "graf.text2" }}>
        Ask a question in plain words{about ? ` about ${about}` : ""}. The Assistant looks it up in the graph and links every claim to the Record or entity it came from.
      </Typography>
      <Typography sx={LABEL_SX}>Try</Typography>
      {SUGGESTIONS.map((s) => (
        <Button key={s} variant="outlined" size="small" sx={{ justifyContent: "flex-start", textAlign: "left", textTransform: "none" }}>
          {s}
        </Button>
      ))}
    </Stack>
  );
}

function Turn({ m }: { m: Message }) {
  if (m.role === "user")
    return (
      <Box sx={{ alignSelf: "flex-end", ml: 6, bgcolor: "graf.raised", borderRadius: 2, px: 1.5, py: 1 }}>
        <Typography variant="body2">{m.text}</Typography>
      </Box>
    );
  // number the non-entity refs of this answer in first-cited order
  // (walked up front: child components render after this function returns)
  const numbered: Ref[] = [];
  const add = (r: Ref) => {
    if (!numbered.some((x) => refId(x) === refId(r))) numbered.push(r);
  };
  for (const b of m.blocks) {
    for (const s of b.segs) if (s.t === "claim") (s.refs.every((r) => r.kind === "entity") ? [s.refs[0]!] : s.refs.filter((r) => r.kind !== "entity")).forEach(add);
    if (b.type === "lead") b.refs.filter((r) => r.kind !== "entity").forEach(add);
  }
  const numberOf = (r: Ref) => numbered.findIndex((x) => refId(x) === refId(r)) + 1;
  const rendered = m.blocks.map((b, i) => <BlockA key={i} b={b} numberOf={numberOf} />);
  return (
    <Stack spacing={1.5}>
      {rendered}
      {numbered.length > 0 && (
        <Box sx={{ borderTop: 1, borderColor: "graf.line", pt: 1 }}>
          <Typography sx={{ ...LABEL_SX, mb: 0.5 }}>Sources · in our data through {m.dataThrough}</Typography>
          <Box component="ol" sx={{ m: 0, pl: 2.5, "& li": { fontSize: 13, color: "graf.text2" } }}>
            {numbered.map((r) => (
              <li key={refId(r)}>
                <Typography component="span" sx={{ ...LABEL_SX, mr: 0.75 }}>
                  {r.kind}
                </Typography>
                <AppHref href={refHref(r)}>{refLabel(r)}</AppHref>
                {r.kind === "record" && <span> · {r.date}</span>}
              </li>
            ))}
          </Box>
        </Box>
      )}
    </Stack>
  );
}

function BlockA({ b, numberOf }: { b: Block; numberOf: (r: Ref) => number }) {
  const prose = (segs: Seg[]) => segs.map((s, i) => <SegA key={i} s={s} numberOf={numberOf} />);
  switch (b.type) {
    case "para":
      return <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{prose(b.segs)}</Typography>;
    case "caveat":
      return (
        <Typography variant="body2" sx={{ lineHeight: 1.7, color: "graf.text2" }}>
          <Typography component="span" sx={{ ...LABEL_SX, mr: 0.75 }}>
            Note
          </Typography>
          {prose(b.segs)}
        </Typography>
      );
    case "lead":
      return (
        <Box sx={{ borderLeft: 3, borderColor: "graf.text2", pl: 1.5, py: 0.5 }}>
          <Typography sx={{ ...LABEL_SX, color: "graf.text", mb: 0.25 }}>Lead · worth verifying</Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
            {prose(b.segs)}
            {b.refs.filter((r) => r.kind !== "entity").map((r) => <Marker key={refId(r)} n={numberOf(r)} r={r} />)}
          </Typography>
          <Typography variant="caption" sx={{ color: "graf.muted" }}>
            A pattern in what the graph returned, not a finding.
          </Typography>
        </Box>
      );
    case "outside":
      return (
        <Box sx={{ border: "1px dashed", borderColor: "graf.lineStrong", borderRadius: 1, p: 1.5 }}>
          <Typography sx={{ ...LABEL_SX, mb: 0.75 }}>🌐 Outside sources · from the web, not our data</Typography>
          <Typography variant="body2" sx={{ color: "graf.text2", mb: 1 }}>
            {b.intro}
          </Typography>
          <Stack spacing={1}>
            {b.sources.map((s) => (
              <Box key={s.url}>
                <AppHref href={s.url}>{s.title}</AppHref>
                <Typography variant="caption" component="div" sx={{ color: "graf.muted" }}>
                  {s.site} · read {s.fetchedAt.slice(0, 10)}
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: "italic", color: "graf.text2" }}>
                  {s.excerpt}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      );
  }
}

function SegA({ s, numberOf }: { s: Seg; numberOf: (r: Ref) => number }): ReactNode {
  switch (s.t) {
    case "text":
      return s.s;
    case "entity":
      return <AppHref href={refHref(s.ref)}>{s.ref.name}</AppHref>;
    case "claim":
      return (
        <>
          {s.s}
          {s.refs.filter((r) => r.kind !== "entity").map((r) => <Marker key={refId(r)} n={numberOf(r)} r={r} />)}
          {s.refs.every((r) => r.kind === "entity") && <Marker n={numberOf(s.refs[0]!)} r={s.refs[0]!} />}
        </>
      );
    case "unverified":
      return (
        <Tooltip title={s.why}>
          <Box component="span" tabIndex={0} sx={{ color: "graf.muted", textDecoration: "line-through", textDecorationColor: "graf.idle" }}>
            {s.s}
            <Box component="span" sx={{ ...LABEL_SX, ml: 0.5, textDecoration: "none", display: "inline-block", border: 1, borderColor: "graf.lineStrong", borderRadius: 0.5, px: 0.5 }}>
              not verified
            </Box>
          </Box>
        </Tooltip>
      );
  }
}

function Marker({ n, r }: { n: number; r: Ref }) {
  return (
    <Tooltip title={`${r.kind}: ${refLabel(r)}`}>
      <Box component="sup" sx={{ fontSize: 10, ml: 0.25 }}>
        <AppHref href={refHref(r)}>[{n}]</AppHref>
      </Box>
    </Tooltip>
  );
}
