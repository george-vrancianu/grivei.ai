// PROTOTYPE (#343), throwaway. Variant B: the Assistant has its own page (/explore/assistant), reached from an "Ask about this entity"
// button on entity pages. Prose answers with inline citation chips; a sticky Sources column splits "In our data" from "Outside sources";
// clicking a claim lights up its sources.
import { useState, type ReactNode } from "react";
import { Box, Button, Chip, Stack, Tooltip, Typography } from "@grivei/ui";
import { navigate } from "../routing/location.tsx";
import { AppHref, Checking, Composer, DISCLAIMER, LABEL_SX, StateNotice, useProto } from "./parts.tsx";
import { CONVERSATION, PRIVATE_CONVERSATION, citedRefs, refHref, refId, refLabel, SUGGESTIONS, type Block, type Message, type OutsideSource, type Ref, type Seg } from "./data.ts";

export const NAME = "Own page + sources column";

/** On an entity page: the way in. */
export function EntryButtonB({ entityKey, name }: { entityKey: string; name: string }) {
  return (
    <Button
      variant="contained"
      onClick={() => navigate(`/explore/assistant?about=${entityKey}${window.location.search.replace("?", "&")}`)}
      sx={{ position: "fixed", right: 24, top: 84, zIndex: 1300 }}
    >
      Ask about {name}
    </Button>
  );
}

export function AssistantPageB() {
  const { tier, state } = useProto();
  const [active, setActive] = useState<string[]>([]);
  const messages = tier === "private" ? PRIVATE_CONVERSATION : CONVERSATION;
  const showConversation = !(state === "empty" || state === "off" || state === "quota-out");
  const graph = showConversation ? citedRefs(messages) : [];
  const outside = showConversation ? messages.flatMap((m) => (m.role === "assistant" ? m.blocks.flatMap((b) => (b.type === "outside" ? b.sources : [])) : [])) : [];
  const about = new URLSearchParams(window.location.search).get("about");

  return (
    <Box sx={{ maxWidth: 1240, mx: "auto", px: 3, py: 4 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "baseline", mb: 3 }}>
        <Typography variant="h1" sx={{ fontSize: 32 }}>
          Assistant
        </Typography>
        {about && (
          <Stack sx={{ alignItems: "center" }} direction="row" spacing={1}>
            <Typography sx={LABEL_SX}>Starting from</Typography>
            <Chip size="small" variant="outlined" label="ALFA DEMO SRL" onClick={() => navigate(`/explore/supplier/${about}${window.location.search.replace(/[?&]about=[^&]*/, "").replace(/^&/, "?")}`)} />
          </Stack>
        )}
        <Box sx={{ flex: 1 }} />
        {tier === "private" && showConversation && <Button variant="outlined">Export conversation</Button>}
        <Button variant="outlined">New conversation</Button>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 340px" }, gap: 4, alignItems: "start" }}>
        <Stack spacing={4}>
          {!showConversation && <EmptyB />}
          {showConversation &&
            messages.map((m, i) =>
              i === messages.length - 1 && state === "checking" && m.role === "assistant" ? <Checking key={i} /> : <TurnB key={i} m={m} active={active} onPick={setActive} />,
            )}
          <StateNotice state={state} tier={tier} />
          <Box sx={{ position: "sticky", bottom: 72, bgcolor: "graf.bg", pt: 1 }}>
            <Composer state={state} tier={tier} placeholder="Ask a follow-up…" />
          </Box>
        </Stack>

        <Box component="aside" aria-label="Sources" sx={{ position: "sticky", top: 24, border: 1, borderColor: "graf.line", borderRadius: 1, bgcolor: "graf.panel", p: 2 }}>
          <Typography sx={{ ...LABEL_SX, mb: 1 }}>In our data · through 2026-11-02</Typography>
          {graph.length === 0 && <Typography variant="body2" sx={{ color: "graf.muted" }}>Sources appear here as the Assistant cites them.</Typography>}
          <Stack spacing={0.5}>
            {graph.map((r) => (
              <SourceRow key={refId(r)} r={r} lit={active.includes(refId(r))} />
            ))}
          </Stack>
          {tier === "private" && (
            <>
              <Typography sx={{ ...LABEL_SX, mt: 2.5, mb: 1 }}>Outside sources · the web, not our data</Typography>
              {outside.length === 0 ? (
                <Typography variant="body2" sx={{ color: "graf.muted" }}>Only when you ask the Assistant to search the web.</Typography>
              ) : (
                <Stack spacing={1.25}>
                  {outside.map((s) => (
                    <OutsideRow key={s.url} s={s} />
                  ))}
                </Stack>
              )}
            </>
          )}
          <Typography variant="caption" component="p" sx={{ color: "graf.muted", mt: 2.5 }}>
            {DISCLAIMER}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function EmptyB() {
  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h2" sx={{ fontSize: 22, mb: 1 }}>
        What do you want to know about ALFA DEMO SRL?
      </Typography>
      <Typography variant="body2" sx={{ color: "graf.text2", mb: 2 }}>
        The Assistant looks your question up in the graph and links every claim to the Record or entity it came from.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
        {SUGGESTIONS.map((s) => (
          <Chip key={s} label={s} variant="outlined" onClick={() => undefined} />
        ))}
      </Stack>
    </Box>
  );
}

function TurnB({ m, active, onPick }: { m: Message; active: string[]; onPick: (ids: string[]) => void }) {
  if (m.role === "user")
    return (
      <Typography variant="h3" sx={{ fontSize: 20, borderTop: 1, borderColor: "graf.line", pt: 3 }}>
        {m.text}
      </Typography>
    );
  const leads = m.blocks.filter((b) => b.type === "lead");
  return (
    <Stack spacing={2}>
      {m.blocks.filter((b) => b.type !== "lead").map((b, i) => (
        <BlockB key={i} b={b} active={active} onPick={onPick} />
      ))}
      {leads.length > 0 && (
        <Box sx={{ bgcolor: "graf.raised", borderRadius: 1, p: 2 }}>
          <Typography sx={{ ...LABEL_SX, color: "graf.text", mb: 1 }}>Leads · patterns worth verifying, not findings</Typography>
          {leads.map((b, i) => (
            <Stack sx={{ alignItems: "flex-start" }} key={i} direction="row" spacing={1.25}>
              <Box sx={{ mt: 0.75, width: 8, height: 8, border: 1.5, borderColor: "graf.text2", borderRadius: "50%", flexShrink: 0 }} />
              <Typography variant="body1" sx={{ lineHeight: 1.7, cursor: "pointer" }} onClick={() => onPick(b.refs.map(refId))}>
                {b.segs.map((s, j) => (
                  <SegB key={j} s={s} active={active} onPick={onPick} />
                ))}
              </Typography>
            </Stack>
          ))}
        </Box>
      )}
      <Typography sx={LABEL_SX}>
        {m.toolCalls} lookups in the graph · data through {m.dataThrough}
      </Typography>
    </Stack>
  );
}

function BlockB({ b, active, onPick }: { b: Block; active: string[]; onPick: (ids: string[]) => void }) {
  const prose = (segs: Seg[]) => segs.map((s, i) => <SegB key={i} s={s} active={active} onPick={onPick} />);
  if (b.type === "outside")
    return (
      <Box sx={{ borderLeft: "3px dashed", borderColor: "graf.idle", pl: 2 }}>
        <Typography sx={{ ...LABEL_SX, mb: 0.5 }}>From the web</Typography>
        <Typography variant="body1" sx={{ color: "graf.text2", lineHeight: 1.7 }}>
          {b.intro} <span style={{ whiteSpace: "nowrap" }}>→ listed under Outside sources.</span>
        </Typography>
      </Box>
    );
  return (
    <Typography variant="body1" sx={{ lineHeight: 1.8, color: b.type === "caveat" ? "graf.text2" : "graf.text" }}>
      {prose(b.segs)}
    </Typography>
  );
}

function SegB({ s, active, onPick }: { s: Seg; active: string[]; onPick: (ids: string[]) => void }): ReactNode {
  switch (s.t) {
    case "text":
      return s.s;
    case "entity":
      return <AppHref href={refHref(s.ref)}>{s.ref.name}</AppHref>;
    case "claim": {
      const ids = s.refs.map(refId);
      const lit = ids.length > 0 && ids.every((id) => active.includes(id));
      return (
        <Box component="span" onClick={() => onPick(ids)} sx={{ cursor: "pointer", bgcolor: lit ? "graf.line" : "transparent", borderRadius: 0.5, "&:hover": { bgcolor: "graf.raised" } }}>
          {s.s}
          {s.refs.map((r) => (
            <Chip component="span" key={refId(r)} size="small" variant="outlined" label={r.kind === "record" ? r.code : r.kind === "entity" ? "entity" : r.label} sx={{ ml: 0.5, height: 18, fontSize: 10, verticalAlign: "1px" }} />
          ))}
        </Box>
      );
    }
    case "unverified":
      return (
        <Tooltip title={s.why}>
          <Box component="span" tabIndex={0} sx={{ borderBottom: "1px dashed", borderColor: "graf.idle", color: "graf.muted" }}>
            {s.s}
            <Chip component="span" size="small" label="no source" sx={{ ml: 0.5, height: 18, fontSize: 10, verticalAlign: "1px" }} />
          </Box>
        </Tooltip>
      );
  }
}

function SourceRow({ r, lit }: { r: Ref; lit: boolean }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", px: 1, py: 0.5, borderRadius: 0.5, bgcolor: lit ? "graf.line" : "transparent", outline: lit ? 1 : 0, outlineColor: "graf.lineStrong" }}>
      <Typography sx={{ ...LABEL_SX, width: 52, flexShrink: 0 }}>{r.kind}</Typography>
      <Box sx={{ minWidth: 0 }}>
        <AppHref href={refHref(r)}>{refLabel(r)}</AppHref>
        {r.kind === "record" && (
          <Typography variant="caption" component="div" sx={{ color: "graf.muted" }}>
            {r.title} · {r.date}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

function OutsideRow({ s }: { s: OutsideSource }) {
  return (
    <Box sx={{ border: "1px dashed", borderColor: "graf.lineStrong", borderRadius: 1, p: 1 }}>
      <AppHref href={s.url}>{s.title}</AppHref>
      <Typography variant="caption" component="div" sx={{ color: "graf.muted" }}>
        {s.site} · read {s.fetchedAt.slice(0, 10)}
      </Typography>
      <Typography variant="caption" component="div" sx={{ fontStyle: "italic", color: "graf.text2" }}>
        {s.excerpt}
      </Typography>
    </Box>
  );
}
