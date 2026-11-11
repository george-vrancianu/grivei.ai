// PROTOTYPE, throwaway. Entity variant C, "Relationships": the page is the entity's neighbourhood.
// A radial graph of counterparties (size = money, edge colour = direct vs contract, dashed = won together),
// a monthly timeline underneath, and a side panel showing one relationship: every record between the pair.
import { useMemo, useState } from "react";
import * as d3 from "d3";
import { Box, Link, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ron, kindLabel, authorities } from "./data";
import { href } from "./entity";
import { TopBar, SignalChip, SEAP, FlowMap, Footnote, place } from "./shared";

const W = 640, H = 560, N = 24;

function Radial({ p, pick, picked }) {
  const nodes = p.counterparties.slice(0, N);
  const max = nodes[0]?.value || 1;
  const rr = d3.scaleSqrt().domain([0, max]).range([4, 26]);
  const ew = d3.scaleLinear().domain([0, max]).range([0.5, 10]);
  const cx = W / 2, cy = H / 2, R = 210;
  const pos = new Map(nodes.map((c, i) => { const a = (i / nodes.length) * 2 * Math.PI - Math.PI / 2; return [c.id, [cx + R * Math.cos(a), cy + R * Math.sin(a), a]]; }));
  // co-winners among the shown counterparties (authority page) or consortium partners (supplier page)
  const links = useMemo(() => {
    const m = new Map();
    for (const r of p.consortia) {
      const ids = p.type === "supplier" ? [] : r.suppliers.filter((c) => pos.has(c));
      for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const k = [ids[i], ids[j]].sort().join("|"); m.set(k, (m.get(k) || 0) + 1); }
    }
    return [...m.entries()].map(([k, n]) => [...k.split("|"), n]);
  }, [p]);
  const sigOf = (c) => c.recs.some((r) => p.flags.get(r.i).length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {links.map(([a, b, n]) => { const [x1, y1] = pos.get(a), [x2, y2] = pos.get(b);
        return <path key={a + b} d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`} fill="none" stroke="#9aa4b2" strokeDasharray="3 3" strokeOpacity={0.6}><title>won {n} contract(s) together</title></path>; })}
      {nodes.map((c) => { const [x, y] = pos.get(c.id); const mix = c.direct / (c.value || 1);
        return <line key={c.id} x1={cx} y1={cy} x2={x} y2={y} stroke={d3.interpolateRgb("#4fa3ff", "#F2B33D")(mix)} strokeWidth={ew(c.value)} strokeOpacity={picked && picked !== c.id ? 0.15 : 0.7} />; })}
      <circle cx={cx} cy={cy} r={34} fill="#3a2f17" stroke="#F2B33D" />
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#fff" fontSize={10}>{p.ent.name.slice(0, 18)}</text>
      {nodes.map((c) => { const [x, y, a] = pos.get(c.id); const right = Math.cos(a) >= 0;
        return (
          <g key={c.id} onClick={() => pick(c.id)} style={{ cursor: "pointer" }} opacity={picked && picked !== c.id ? 0.4 : 1}>
            <circle cx={x} cy={y} r={rr(c.value)} fill="#1d2028" stroke={sigOf(c) ? "#ffa726" : "#cfd6e0"} strokeWidth={sigOf(c) ? 2.5 : 1} />
            <text x={x + (right ? 1 : -1) * (rr(c.value) + 4)} y={y + 3} textAnchor={right ? "start" : "end"} fill="#cfd6e0" fontSize={9}>{c.name.slice(0, 26)}</text>
            <title>{c.name}: {ron(c.value)} in {c.n} records</title>
          </g>);
      })}
    </svg>
  );
}

function Timeline({ p, picked }) {
  const recs = picked ? p.recs.filter((r) => (p.type === "supplier" ? r.authority === picked : r.suppliers.includes(picked))) : p.recs;
  const months = d3.rollups(recs, (rs) => ({ direct: d3.sum(rs.filter((r) => r.kind === "direct"), p.share), contract: d3.sum(rs.filter((r) => r.kind === "contract"), p.share) }), (r) => r.date.slice(0, 7));
  const all = d3.timeMonths(new Date(p.years[0], 0, 1), new Date(+p.years.at(-1) + 1, 0, 1)).map((d) => d3.timeFormat("%Y-%m")(d));
  const by = new Map(months), w = 900, h = 110;
  const x = d3.scaleBand().domain(all).range([0, w]).padding(0.15);
  const y = d3.scaleLinear().domain([0, d3.max(months, ([, v]) => v.direct + v.contract) || 1]).range([h - 16, 0]);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%">
      {all.map((m) => { const v = by.get(m) || { direct: 0, contract: 0 };
        return <g key={m}><title>{m}: {ron(v.contract)} contracts, {ron(v.direct)} direct</title>
          <rect x={x(m)} width={x.bandwidth()} y={y(v.contract)} height={h - 16 - y(v.contract)} fill="#4fa3ff" />
          <rect x={x(m)} width={x.bandwidth()} y={y(v.contract + v.direct)} height={y(v.contract) - y(v.contract + v.direct)} fill="#F2B33D" />
          {m.endsWith("-01") && <text x={x(m)} y={h - 3} fill="#9aa4b2" fontSize={10}>{m.slice(0, 4)}</text>}</g>; })}
    </svg>
  );
}

export default function EntityC({ p }) {
  const isSup = p.type === "supplier";
  const other = isSup ? "authority" : "supplier";
  const [picked, setPicked] = useState(null);
  const [view, setView] = useState("graph");
  const c = p.counterparties.find((x) => x.id === picked);
  const sigs = p.signals.over.length + p.signals.split.length + p.signals.noncomp.length;
  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar p={p} />
      <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(340px,1fr)", minHeight: 0 }}>
        <Box sx={{ p: 2, overflow: "auto" }}>
          <Stack direction="row" sx={{ alignItems: "center", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5">{p.ent.name}</Typography>
              <Typography variant="body2" color="text.secondary">CUI {p.id} · {place(p.ent)} · {ron(p.total)} {isSup ? "from" : "to"} {p.counterparties.length} {isSup ? "authorities" : "suppliers"} · {sigs} Signals</Typography>
            </Box>
            {isSup && <ToggleButtonGroup size="small" exclusive value={view} onChange={(_, v) => v && setView(v)}>
              <ToggleButton value="graph">Relationships</ToggleButton><ToggleButton value="flow">Flow lens</ToggleButton></ToggleButtonGroup>}
          </Stack>
          {view === "flow" && isSup ? <FlowMap p={p} /> : <Radial p={p} pick={(id) => setPicked(picked === id ? null : id)} picked={picked} />}
          <Typography variant="caption" color="text.secondary">
            Top {Math.min(N, p.counterparties.length)} {isSup ? "authorities" : "suppliers"} by money. Edge colour: <span style={{ color: "#4fa3ff" }}>contracts</span> → <span style={{ color: "#F2B33D" }}>direct purchases</span>. Orange ring: has Signals. {!isSup && "Dashed: won a contract together."}
          </Typography>
          <Typography variant="overline" display="block" sx={{ mt: 2 }} color="text.secondary">Per month{c && ` · with ${c.name}`}</Typography>
          <Timeline p={p} picked={picked} />
        </Box>
        <Paper square variant="outlined" sx={{ p: 2, overflow: "auto", pb: 10 }}>
          {!c ? (
            <>
              <Typography variant="subtitle1">Pick a {isSup ? "paying authority" : "supplier"} on the graph</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>to see every record between the two, with its source document.</Typography>
              <Typography variant="overline" color="text.secondary">Relationships with Signals</Typography>
              {p.counterparties.filter((x) => x.recs.some((r) => p.flags.get(r.i).length)).slice(0, 15).map((x) => (
                <Typography key={x.id} component="div" variant="body2" sx={{ py: 0.4, cursor: "pointer" }} onClick={() => setPicked(x.id)}>
                  {x.name} · {[...new Set(x.recs.flatMap((r) => p.flags.get(r.i)))].map((k) => <SignalChip key={k} k={k} />)}
                </Typography>
              ))}
              <Footnote />
            </>
          ) : (
            <>
              <Typography variant="overline" color="text.secondary">{isSup ? "Paid by" : "Paid to"}</Typography>
              <Typography variant="h6"><Link href={href[other](c.id)}>{c.name}</Link></Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>{ron(c.value)} · {c.n} records · {(100 * c.value / p.total).toFixed(1)}% of {isSup ? "its income here" : "its spending"}
                {!isSup && authorities.get(p.id) && ""}</Typography>
              {c.recs.sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
                <Box key={r.i} sx={{ py: 0.75, borderBottom: 1, borderColor: "divider" }}>
                  <Typography variant="body2"><Link href={href.record(r.i)}>{r.title.slice(0, 90)}</Link></Typography>
                  <Typography variant="caption" color="text.secondary">{r.date} · {kindLabel[r.kind]} · {r.proc} · {ron(r.value)}{r.suppliers.length > 1 && ` ÷${r.suppliers.length}`} · <SEAP r={r} /></Typography>
                  <Box>{p.flags.get(r.i).map((k) => <SignalChip key={k} k={k} />)}</Box>
                </Box>
              ))}
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
