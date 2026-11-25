// PROTOTYPE (#343), throwaway. Variant C: a "brief" overlay over the entity page, one question at a time (earlier ones fold into a list).
// No chat bubbles: the answer is a ledger, one claim per row with its source in a right-hand column. Unverified claims leave the ledger
// and are listed apart; Leads and Outside sources get their own sections.
import { useState, type ReactNode } from "react";
import { Box, Button, Chip, IconButton, Stack, Typography } from "@grivei/ui";
import { AppHref, Checking, Composer, currentEntity, DISCLAIMER, LABEL_SX, StateNotice, useProto } from "./parts.tsx";
import { ANSWER_1, ANSWER_2, QUESTION_1, QUESTION_2, refHref, refId, refLabel, SUGGESTIONS, type Message, type Ref, type Seg } from "./data.ts";

export const NAME = "Brief overlay (claim ledger)";

type Answer = Extract<Message, { role: "assistant" }>;

export function VariantC() {
  const { tier, state, pathname } = useProto();
  const [open, setOpen] = useState(true);
  const about = currentEntity(pathname);
  const turns: [string, Answer][] = tier === "private" ? [[QUESTION_1, ANSWER_1], [QUESTION_2, ANSWER_2]] : [[QUESTION_1, ANSWER_1]];
  const [current, setCurrent] = useState(turns.length - 1);
  const shown = turns[Math.min(current, turns.length - 1)]!;
  const blank = state === "empty" || state === "off" || state === "quota-out";

  if (!open)
    return (
      <Button variant="contained" onClick={() => setOpen(true)} sx={{ position: "fixed", right: 24, bottom: 88, zIndex: 1300, borderRadius: 6, px: 3 }}>
        Ask {about ? `about ${about.name}` : "the Assistant"} · ⌘K
      </Button>
    );

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 1250, bgcolor: "rgba(5,7,10,0.72)", display: "flex", justifyContent: "center", alignItems: "flex-start", pt: 6, pb: 10, overflowY: "auto" }} onClick={() => setOpen(false)}>
      <Box role="dialog" aria-label="Assistant" onClick={(e) => e.stopPropagation()} sx={{ width: "min(920px, 94vw)", bgcolor: "graf.panel", border: 1, borderColor: "graf.lineStrong", borderRadius: 1.5, boxShadow: 8 }}>
        <Box sx={{ p: 2.5, borderBottom: 1, borderColor: "graf.line" }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 1.5 }}>
            <Typography sx={{ ...LABEL_SX, flex: 1 }}>Assistant{about ? ` · about ${about.name}` : ""}</Typography>
            {tier === "private" && !blank && <Button size="small">Export</Button>}
            <IconButton size="small" aria-label="Close" onClick={() => setOpen(false)}>
              ✕
            </IconButton>
          </Stack>
          <Composer state={state} tier={tier} placeholder={about ? `Ask about ${about.name}…` : "Ask…"} />
        </Box>

        <Box sx={{ p: 2.5 }}>
          <StateNotice state={state} tier={tier} />
          {blank && state === "empty" && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
              {SUGGESTIONS.map((s) => (
                <Chip key={s} label={s} variant="outlined" onClick={() => undefined} />
              ))}
            </Stack>
          )}
          {!blank && (
            <>
              {turns.length > 1 && (
                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
                  {turns.map(([q], i) => (
                    <Chip key={q} size="small" label={`${i + 1}. ${q.length > 48 ? `${q.slice(0, 48)}…` : q}`} variant={i === current ? "filled" : "outlined"} onClick={() => setCurrent(i)} />
                  ))}
                </Stack>
              )}
              <Typography variant="h2" sx={{ fontSize: 22, mb: 2 }}>
                {shown[0]}
              </Typography>
              {state === "checking" ? <Checking /> : <Brief a={shown[1]} />}
            </>
          )}
        </Box>
        <Typography variant="caption" component="p" sx={{ color: "graf.muted", px: 2.5, pb: 2 }}>
          {DISCLAIMER}
        </Typography>
      </Box>
    </Box>
  );
}

/** Splits an answer into ledger rows: each claim with the refs the check matched. */
function rowsOf(a: Answer, type: "para" | "caveat"): { text: ReactNode; refs: Ref[] }[] {
  const rows: { text: ReactNode; refs: Ref[] }[] = [];
  for (const b of a.blocks) {
    if (b.type !== type) continue;
    let lead: ReactNode[] = [];
    for (const s of b.segs) {
      if (s.t === "entity") lead.push(<AppHref key={rows.length + "e" + lead.length} href={refHref(s.ref)}>{s.ref.name}</AppHref>);
      if (s.t === "text" && s.s.trim().length > 2) {
        const t = lead.length === 0 ? s.s.replace(/^[\s,.;:]*(and\s+)?/, "") : s.s;
        if (t) lead.push(t.charAt(0).toUpperCase() + t.slice(1));
      }
      if (s.t === "text" && s.s.trim().length <= 2) lead.push(" ");
      if (s.t === "claim") {
        rows.push({ text: <>{lead}{s.s}</>, refs: s.refs });
        lead = [];
      }
    }
    if (lead.some((x) => typeof x !== "string" || x.trim())) rows.push({ text: <>{lead}</>, refs: [] });
  }
  return rows;
}

function Brief({ a }: { a: Answer }) {
  const facts = rowsOf(a, "para");
  const caveats = rowsOf(a, "caveat");
  const unverified = a.blocks.flatMap((b) => b.segs.filter((s): s is Extract<Seg, { t: "unverified" }> => s.t === "unverified"));
  const leads = a.blocks.filter((b) => b.type === "lead");
  const outside = a.blocks.flatMap((b) => (b.type === "outside" ? [b] : []));
  return (
    <Stack spacing={3}>
      {outside.map((o, i) => (
        <Section key={i} title="Outside sources" note="pages from the web, not our data; nothing in them is matched to an entity">
          <Typography variant="body2" sx={{ color: "graf.text2", mb: 1.5 }}>
            {o.intro}
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
            {o.sources.map((s) => (
              <Box key={s.url} sx={{ border: "1px dashed", borderColor: "graf.lineStrong", borderRadius: 1, p: 1.5 }}>
                <Typography sx={LABEL_SX}>{s.site}</Typography>
                <AppHref href={s.url}>{s.title}</AppHref>
                <Typography variant="body2" sx={{ fontStyle: "italic", color: "graf.text2", mt: 0.5 }}>
                  {s.excerpt}
                </Typography>
                <Typography variant="caption" sx={{ color: "graf.muted" }}>
                  read {s.fetchedAt.slice(0, 16).replace("T", " ")}
                </Typography>
              </Box>
            ))}
          </Box>
        </Section>
      ))}
      {facts.length > 0 && (
        <Section title="What our data says" note={`through ${a.dataThrough} · ${a.toolCalls} lookups`}>
          <Ledger rows={facts} />
        </Section>
      )}
      {caveats.length > 0 && (
        <Section title="Read with care">
          <Ledger rows={caveats} muted />
        </Section>
      )}
      {leads.length > 0 && (
        <Section title="Leads" note="patterns worth verifying; not findings">
          {leads.map((l, i) => (
            <Box key={i} sx={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 220px", gap: 2, border: 1, borderColor: "graf.lineStrong", borderRadius: 1, p: 1.5 }}>
              <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                <Typography component="span" sx={{ ...LABEL_SX, color: "graf.text", mr: 1 }}>
                  ? Worth checking
                </Typography>
                {l.segs.map((s, j) => (s.t === "entity" ? <AppHref key={j} href={refHref(s.ref)}>{s.ref.name}</AppHref> : s.t === "unverified" ? null : <span key={j}>{s.s}</span>))}
              </Typography>
              <RefList refs={l.refs} />
            </Box>
          ))}
        </Section>
      )}
      {unverified.length > 0 && (
        <Section title="Not verified, left out" note="the check found no source for these; they are not part of the answer">
          {unverified.map((u, i) => (
            <Box key={i} sx={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 220px", gap: 2, py: 0.75 }}>
              <Typography variant="body2" sx={{ color: "graf.muted", textDecoration: "line-through" }}>
                {u.s}
              </Typography>
              <Typography variant="caption" sx={{ color: "graf.muted" }}>
                {u.why}
              </Typography>
            </Box>
          ))}
        </Section>
      )}
    </Stack>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "baseline", mb: 1, borderBottom: 1, borderColor: "graf.line", pb: 0.5 }}>
        <Typography sx={{ ...LABEL_SX, color: "graf.text" }}>{title}</Typography>
        {note && <Typography sx={LABEL_SX}>· {note}</Typography>}
      </Stack>
      {children}
    </Box>
  );
}

function Ledger({ rows, muted = false }: { rows: { text: ReactNode; refs: Ref[] }[]; muted?: boolean }) {
  return (
    <Box>
      {rows.map((r, i) => (
        <Box key={i} sx={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 220px", gap: 2, py: 0.75, borderBottom: 1, borderColor: "graf.line", "&:last-of-type": { borderBottom: 0 } }}>
          <Typography variant="body1" sx={{ lineHeight: 1.6, color: muted ? "graf.text2" : "graf.text" }}>
            {r.text}
          </Typography>
          <RefList refs={r.refs} />
        </Box>
      ))}
    </Box>
  );
}

function RefList({ refs }: { refs: Ref[] }) {
  return (
    <Stack spacing={0.25}>
      {refs.map((r) => (
        <Stack sx={{ alignItems: "baseline" }} key={refId(r)} direction="row" spacing={0.75}>
          <Typography sx={{ ...LABEL_SX, width: 48, flexShrink: 0 }}>{r.kind}</Typography>
          <Box sx={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 12, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <AppHref href={refHref(r)}>{refLabel(r)}</AppHref>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}
