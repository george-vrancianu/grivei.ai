// PROTOTYPE, throwaway. Answers "how does the map draw counties and a zoomed county?" (issue #25).
// Route #/county/<ISO>, variants ?zoom=A|B|C. Money lens only; real Q3 2026 data (ADR exports, ANAF localities,
// ANCPI UAT polygons, Wikidata points). The outline toggle compares geoBoundaries ADM1 with ANCPI dissolved UATs.
import { useMemo, useState } from "react";
import * as d3 from "d3";
import { Box, Chip, Link, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import raw from "./countygeo.json";
import { counties as gb } from "./data";

const K = Math.cos((46 * Math.PI) / 180);
const sc = (c) => (typeof c[0] === "number" ? [c[0] * K, c[1]] : c.map(sc));
const planar = (g) => ({ type: "Feature", geometry: { ...g, coordinates: sc(g.coordinates) } });
const ron = (v) => (v >= 1e6 ? `${d3.format(",.1f")(v / 1e6)}M` : v >= 1e3 ? `${d3.format(",.0f")(v / 1e3)}k` : d3.format(",.0f")(v)) + " RON";
const W = 620, H = 520;
const KINDS = { hall: ["City hall / council", "#F2B33D"], school: ["Schools", "#4fa3ff"], health: ["Health", "#ff6b81"],
  order: ["Police, courts, ISU", "#a78bfa"], utility: ["Utilities and companies", "#34d399"], other: ["Other", "#8b93a3"] };
const gbName = new Map(gb.features.map((f) => [f.properties.iso, f.properties.name]));
const gbGeom = new Map(gb.features.map((f) => [f.properties.iso, f.geometry]));

function useCounty(iso, outlineSrc) {
  return useMemo(() => {
    const c = raw.counties[iso];
    const outline = planar(outlineSrc === "ancpi" ? raw.ancpiOutline[iso] : gbGeom.get(iso));
    const proj = d3.geoIdentity().reflectY(true).fitExtent([[10, 10], [W - 10, H - 10]], planar(raw.ancpiOutline[iso]));
    const path = d3.geoPath(proj);
    const xy = (p) => proj([p[0] * K, p[1]]);
    const uats = new Map(c.uats.map((u) => [u.siruta, { ...u, value: 0, n: 0, auths: [], xy: xy(u.pt) }]));
    for (const a of c.authorities) { const u = uats.get(a.uat); u.value += a.value; u.n += 1; u.auths.push(a); }
    const seat = [...uats.values()].find((u) => u.tip === 1) || [...uats.values()].sort((a, b) => b.n - a.n)[0];
    const total = d3.sum(c.authorities, (a) => a.value);
    return { c, outline, path, xy, uats, seat, total };
  }, [iso, outlineSrc]);
}

function Header({ iso, setIso, outlineSrc, setOutlineSrc, z }) {
  const isos = Object.keys(raw.counties).filter((k) => k !== "null").sort((a, b) => (gbName.get(a) || a).localeCompare(gbName.get(b) || b));
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: "center", px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
      <Link href="#/" underline="none" sx={{ fontFamily: "monospace", fontWeight: 600, color: "text.primary" }}>grivei.ai</Link>
      <Typography variant="body2" color="text.secondary"><Link href="#/" color="inherit">Romania</Link> /</Typography>
      <Select size="small" value={iso} onChange={(e) => (location.hash = `#/county/${e.target.value}`)}>
        {isos.map((k) => <MenuItem key={k} value={k}>{gbName.get(k) || k}</MenuItem>)}
      </Select>
      <Chip size="small" label="Money lens · SEAP · Q3 2026 awarded RON" variant="outlined" />
      <Box sx={{ flex: 1 }} />
      <Typography variant="caption" color="text.secondary">County outline</Typography>
      <ToggleButtonGroup size="small" exclusive value={outlineSrc} onChange={(_, v) => v && setOutlineSrc(v)}>
        <ToggleButton value="gb">geoBoundaries</ToggleButton>
        <ToggleButton value="ancpi">ANCPI</ToggleButton>
        <ToggleButton value="both">both</ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}

function Outline({ d, outlineSrc }) {
  if (outlineSrc !== "both") return <path d={d.path(d.outline)} fill="none" stroke="#c9ced8" strokeWidth={1.5} />;
  return (<>
    <path d={d.path(planar(gbGeom.get(d.c.iso)))} fill="none" stroke="#ff6b81" strokeWidth={1.2} />
    <path d={d.path(planar(raw.ancpiOutline[d.c.iso]))} fill="none" stroke="#4fa3ff" strokeWidth={1.2} />
  </>);
}

/** Right pane: authorities in the current selection, ranked by RON; plus the off-map rows. */
function Hits({ d, sel, setSel, filter }) {
  const list = d.c.authorities.filter(filter || (() => true)).sort((a, b) => b.value - a.value);
  return (
    <Box sx={{ borderLeft: 1, borderColor: "divider", overflow: "auto" }}>
      <Stack direction="row" spacing={1} sx={{ p: 2, pb: 1, alignItems: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {list.length} authorities · {ron(d3.sum(list, (a) => a.value))}
        </Typography>
        {sel && <Chip size="small" label={sel.label} onDelete={() => setSel(null)} />}
      </Stack>
      <Table size="small" stickyHeader>
        <TableHead><TableRow><TableCell>Authority</TableCell><TableCell>Place (ANAF)</TableCell><TableCell align="right">RON</TableCell></TableRow></TableHead>
        <TableBody>
          {list.slice(0, 50).map((a) => (
            <TableRow key={a.cui} hover>
              <TableCell sx={{ maxWidth: 260 }}><Typography variant="body2">{a.name}</Typography>
                <Typography variant="caption" color="text.secondary">{KINDS[a.kind][0]} · {a.n} records</Typography></TableCell>
              <TableCell><Typography variant="caption">{a.loc}</Typography></TableCell>
              <TableCell align="right">{ron(a.value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function OffMap({ d }) {
  const nat = d.c.national, un = d.c.unplaced;
  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
      <Paper variant="outlined" sx={{ p: 1, flex: 1 }}>
        <Typography variant="caption" color="text.secondary">Unplaced in {gbName.get(d.c.iso)} (county known, locality not)</Typography>
        <Typography variant="body2">{un.length ? `${un.length} authorities · ${ron(d3.sum(un, (a) => a.value))}` : "none: ANAF placed every authority here"}</Typography>
      </Paper>
      <Paper variant="outlined" sx={{ p: 1, flex: 1 }}>
        <Typography variant="caption" color="text.secondary">Seated here but national (in the National tile, not on this map)</Typography>
        <Typography variant="body2">{nat.length} authorities · {ron(d3.sum(nat, (a) => a.value))}</Typography>
      </Paper>
    </Stack>
  );
}

const shareLine = (d) => `${d.seat.name}: ${d.seat.n} of ${d.c.authorities.length} authorities (${Math.round((100 * d.seat.n) / d.c.authorities.length)}%), `
  + `${ron(d.seat.value)} of ${ron(d.total)} (${Math.round((100 * d.seat.value) / d.total)}%)`;

/** A: county outline, one circle per UAT, area ∝ RON (sqrt). The seat dominates as much as the money says. */
function ZoomA({ d, outlineSrc }) {
  const [sel, setSel] = useState(null);
  const us = [...d.uats.values()].filter((u) => u.n).sort((a, b) => b.value - a.value);
  const r = d3.scaleSqrt().domain([0, d3.max(us, (u) => u.value)]).range([1.5, 46]);
  return (
    <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", minHeight: 0 }}>
      <Box sx={{ p: 2, overflow: "auto" }}>
        <Typography variant="body2" sx={{ mb: 1 }}>A · <b>Points on the outline.</b> One circle per UAT, area ∝ RON (√). No UAT borders.</Typography>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%">
          <path d={d.path(d.outline)} fill="#1d2028" />
          <Outline d={d} outlineSrc={outlineSrc} />
          {us.map((u) => (
            <circle key={u.siruta} cx={u.xy[0]} cy={u.xy[1]} r={r(u.value)} fill="#F2B33D" fillOpacity={sel?.uat === u.siruta ? 0.95 : 0.55}
              stroke="#0f1115" strokeWidth={0.6} style={{ cursor: "pointer" }} onClick={() => setSel({ uat: u.siruta, label: u.name })}>
              <title>{u.name}: {u.n} authorities · {ron(u.value)}</title></circle>
          ))}
        </svg>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{shareLine(d)}</Typography>
        <OffMap d={d} />
      </Box>
      <Hits d={d} sel={sel} setSel={setSel} filter={sel && ((a) => a.uat === sel.uat)} />
    </Box>
  );
}

/** B: UAT choropleth (log colour by RON), no points. The seat is a small polygon, so it can't swamp the map. */
function ZoomB({ d, outlineSrc }) {
  const [sel, setSel] = useState(null);
  const us = [...d.uats.values()];
  const max = d3.max(us, (u) => u.value) || 1;
  const color = d3.scaleSequentialLog(d3.interpolateYlOrBr).domain([Math.max(1e3, max / 1e4), max]).clamp(true);
  const ranked = us.filter((u) => u.n).sort((a, b) => b.value - a.value);
  return (
    <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", minHeight: 0 }}>
      <Box sx={{ p: 2, overflow: "auto" }}>
        <Typography variant="body2" sx={{ mb: 1 }}>B · <b>UAT choropleth.</b> ANCPI UAT polygons coloured by RON (log); grey = no authority bought this quarter.</Typography>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%">
          {us.map((u) => (
            <path key={u.siruta} d={d.path(planar(u.geom))} fill={u.n ? color(Math.max(u.value, 1)) : "#262a33"}
              stroke={sel?.uat === u.siruta ? "#fff" : "#0f1115"} strokeWidth={sel?.uat === u.siruta ? 2 : 0.4}
              style={{ cursor: "pointer" }} onClick={() => setSel({ uat: u.siruta, label: u.name })}>
              <title>{u.name}: {u.n} authorities · {ron(u.value)}</title></path>
          ))}
          <Outline d={d} outlineSrc={outlineSrc} />
        </svg>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary">Top UATs:</Typography>
          {ranked.slice(0, 6).map((u) => <Chip key={u.siruta} size="small" variant="outlined" label={`${u.name} ${ron(u.value)}`} onClick={() => setSel({ uat: u.siruta, label: u.name })} />)}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>{shareLine(d)}</Typography>
        <OffMap d={d} />
      </Box>
      <Hits d={d} sel={sel} setSel={setSel} filter={sel && ((a) => a.uat === sel.uat)} />
    </Box>
  );
}

/** C: faint UAT borders; points at the village when ANAF names one; the seat leaves the map for a breakdown bar. */
function ZoomC({ d, outlineSrc }) {
  const [sel, setSel] = useState(null);
  const marks = useMemo(() => {
    const m = new Map();
    for (const a of d.c.authorities) {
      if (a.uat === d.seat.siruta) continue;
      const key = a.village || a.uat, u = d.uats.get(a.uat);
      const e = m.get(key) || { key, name: a.vname ? `${a.vname} (${u.name})` : u.name, xy: a.vpt ? d.xy(a.vpt) : u.xy, value: 0, n: 0, village: !!a.vname };
      e.value += a.value; e.n += 1; m.set(key, e);
    }
    return [...m.values()].sort((a, b) => b.value - a.value);
  }, [d]);
  const r = d3.scaleSqrt().domain([0, d3.max(marks, (u) => u.value) || 1]).range([1.5, 22]);
  const byKind = d3.rollups(d.seat.auths, (v) => d3.sum(v, (a) => a.value), (a) => a.kind).sort((a, b) => b[1] - a[1]);
  let x0 = 0;
  return (
    <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", minHeight: 0 }}>
      <Box sx={{ p: 2, overflow: "auto" }}>
        <Typography variant="body2" sx={{ mb: 1 }}>C · <b>Villages on faint UATs, seat broken out.</b> Points at ANAF's village where named, else the UAT; the county seat leaves the map for the bar below.</Typography>
        <Paper variant="outlined" sx={{ p: 1, mb: 1, cursor: "pointer", borderColor: sel?.seat ? "primary.main" : undefined }} onClick={() => setSel({ seat: true, label: d.seat.name })}>
          <Typography variant="caption" color="text.secondary">County seat · {d.seat.name} · {d.seat.n} authorities · {ron(d.seat.value)} ({Math.round((100 * d.seat.value) / d.total)}% of the county)</Typography>
          <svg viewBox="0 0 600 22" width="100%">
            {byKind.map(([k, v]) => {
              const w = (600 * v) / d.seat.value, x = x0; x0 += w;
              return <rect key={k} x={x} y={2} width={w} height={18} fill={KINDS[k][1]} stroke="#0f1115"
                onClick={(e) => { e.stopPropagation(); setSel({ seat: true, kind: k, label: `${d.seat.name} · ${KINDS[k][0]}` }); }}>
                <title>{KINDS[k][0]}: {ron(v)}</title></rect>;
            })}
          </svg>
        </Paper>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%">
          <path d={d.path(d.outline)} fill="#1d2028" />
          {[...d.uats.values()].map((u) => <path key={u.siruta} d={d.path(planar(u.geom))} fill={u.siruta === d.seat.siruta ? "#3a2f17" : "none"} stroke="#2c313c" strokeWidth={0.5} />)}
          <Outline d={d} outlineSrc={outlineSrc} />
          {marks.map((m) => (
            <circle key={m.key} cx={m.xy[0]} cy={m.xy[1]} r={r(m.value)} fill={m.village ? "#4fa3ff" : "#F2B33D"} fillOpacity={0.6}
              stroke="#0f1115" strokeWidth={0.5} style={{ cursor: "pointer" }} onClick={() => setSel({ key: m.key, label: m.name })}>
              <title>{m.name}: {m.n} authorities · {ron(m.value)}</title></circle>
          ))}
          <text x={d.seat.xy[0]} y={d.seat.xy[1]} fill="#F2B33D" fontSize={11} textAnchor="middle">▲ seat (see bar)</text>
        </svg>
        <Typography variant="caption" color="text.secondary">Blue = village named by ANAF ({marks.filter((m) => m.village).length} marks); amber = UAT point.</Typography>
        <OffMap d={d} />
      </Box>
      <Hits d={d} sel={sel} setSel={setSel} filter={sel && ((a) => sel.seat ? a.uat === d.seat.siruta && (!sel.kind || a.kind === sel.kind) : (a.village || a.uat) === sel.key)} />
    </Box>
  );
}

export const ZOOMS = { A: "Points on the outline", B: "UAT choropleth", C: "Villages + seat breakout" };

export default function CountyZoom({ iso, v }) {
  const [outlineSrc, setOutlineSrc] = useState("ancpi");
  if (!raw.counties[iso]) return <p style={{ padding: 20 }}>Unknown county {iso}</p>;
  raw.counties[iso].iso = iso;
  const Z = { A: ZoomA, B: ZoomB, C: ZoomC }[v] || ZoomA;
  return <CountyBody key={iso + v} iso={iso} Z={Z} outlineSrc={outlineSrc} setOutlineSrc={setOutlineSrc} v={v} />;
}

function CountyBody({ iso, Z, outlineSrc, setOutlineSrc, v }) {
  const d = useCounty(iso, outlineSrc === "gb" ? "gb" : "ancpi");
  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header iso={iso} outlineSrc={outlineSrc} setOutlineSrc={setOutlineSrc} z={v} />
      <Z d={d} outlineSrc={outlineSrc} />
    </Box>
  );
}
