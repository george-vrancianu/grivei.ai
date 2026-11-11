// PROTOTYPE, throwaway. Variant C: money-flow map (bubbles + arcs authority county → supplier county),
// table of suppliers ranked by share of the query, drill-down expands rows inline.
import { Fragment, useMemo, useState } from "react";
import * as d3 from "d3";
import { Box, Collapse, IconButton, Link, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography, LinearProgress, Stack } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { search, byCounty, countyName, authorities, suppliers, aggregateSuppliers, ron, kindLabel } from "./data";
import { planar, useGeo } from "./geo";

const W = 640, H = 460;

export default function VariantC() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("supplier");
  const [open, setOpen] = useState(null);
  const recs = useMemo(() => search(q), [q]);
  const agg = useMemo(() => byCounty(recs, mode), [recs, mode]);
  const ranked = useMemo(() => aggregateSuppliers(recs), [recs]);
  const total = d3.sum(ranked, (s) => s.value) || 1;
  const { path, centroid } = useGeo(W, H);
  const r = d3.scaleSqrt().domain([0, d3.max([...agg.values()], (e) => e.value) || 1]).range([0, 34]);
  const flows = useMemo(() => {
    const m = new Map();
    for (const rec of recs) {
      const a = authorities.get(rec.authority).county;
      for (const c of rec.suppliers) {
        const b = suppliers.get(c)?.county; if (!a || !b || a === b) continue;
        const k = `${a}>${b}`; m.set(k, (m.get(k) || 0) + rec.value / rec.suppliers.length);
      }
    }
    return [...m.entries()].map(([k, v]) => ({ a: k.split(">")[0], b: k.split(">")[1], v }));
  }, [recs]);
  const w = d3.scaleLinear().domain([0, d3.max(flows, (f) => f.v) || 1]).range([0.5, 8]);
  const hl = open && suppliers.get(open)?.county;
  const unknown = agg.get("?");

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", p: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <TextField size="small" sx={{ flex: 1 }} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
          <ToggleButton value="authority">Money from</ToggleButton>
          <ToggleButton value="supplier">Money to</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", minHeight: 0 }}>
        <Box sx={{ p: 2, overflow: "auto" }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%">
            {planar.features.map((f) => <path key={f.properties.iso} d={path(f)} fill={f.properties.iso === hl ? "#3a2f17" : "#1d2028"} stroke="#2c313c" />)}
            {flows.map((f) => {
              const [x1, y1] = centroid.get(f.a), [x2, y2] = centroid.get(f.b), mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.25;
              return <path key={f.a + f.b} d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} fill="none" stroke="#F2B33D" strokeOpacity={0.45} strokeWidth={w(f.v)}><title>{countyName.get(f.a)} → {countyName.get(f.b)}: {ron(f.v)}</title></path>;
            })}
            {[...agg.entries()].filter(([k]) => centroid.has(k)).map(([k, e]) => {
              const [x, y] = centroid.get(k);
              return <circle key={k} cx={x} cy={y} r={r(e.value)} fill={mode === "supplier" ? "#4fa3ff" : "#F2B33D"} fillOpacity={0.55} stroke="#fff" strokeWidth={0.5}><title>{countyName.get(k)}: {ron(e.value)} · {e.n} records</title></circle>;
            })}
          </svg>
          <Typography variant="caption" color="text.secondary">
            Bubbles: {mode === "supplier" ? "where suppliers are registered" : "where the paying authority sits"}. Arcs: money crossing county lines.
            {mode === "supplier" && unknown && ` ${ron(unknown.value)} (${unknown.n} records) go to suppliers whose county we don't know yet.`}
            {" "}National authorities: not seeded yet.
          </Typography>
        </Box>
        <Box sx={{ borderLeft: 1, borderColor: "divider", overflow: "auto" }}>
          <Typography variant="body2" color="text.secondary" sx={{ p: 2, pb: 1 }}>{ranked.length} suppliers share {ron(total)}{q && ` for “${q}”`}</Typography>
          <Table size="small" stickyHeader>
            <TableHead><TableRow><TableCell /><TableCell>Supplier</TableCell><TableCell>Share</TableCell><TableCell align="right">RON</TableCell></TableRow></TableHead>
            <TableBody>
              {ranked.slice(0, 40).map((s) => (
                <Fragment key={s.cui}>
                  <TableRow hover onClick={() => setOpen(open === s.cui ? null : s.cui)} sx={{ cursor: "pointer" }}>
                    <TableCell padding="checkbox"><IconButton size="small"><KeyboardArrowDownIcon sx={{ transform: open === s.cui ? "rotate(180deg)" : "none" }} /></IconButton></TableCell>
                    <TableCell>
                      <Link href={`#/supplier/${s.cui}`} variant="body2" onClick={(e) => e.stopPropagation()}>{suppliers.get(s.cui)?.name}</Link>
                      <Typography variant="caption" color="text.secondary">CUI {s.cui} · {countyName.get(suppliers.get(s.cui)?.county) || "county unknown"} · {s.n} records</Typography>
                    </TableCell>
                    <TableCell sx={{ width: 90 }}><LinearProgress variant="determinate" value={(100 * s.value) / total} /><Typography variant="caption">{((100 * s.value) / total).toFixed(1)}%</Typography></TableCell>
                    <TableCell align="right">{ron(s.value)}</TableCell>
                  </TableRow>
                  <TableRow><TableCell colSpan={4} sx={{ py: 0, borderBottom: open === s.cui ? undefined : 0 }}>
                    <Collapse in={open === s.cui} unmountOnExit>
                      <Box sx={{ py: 1 }}>
                        {s.recs.sort((a, b) => b.value - a.value).slice(0, 8).map((rec) => (
                          <Typography key={rec.i} variant="caption" display="block" sx={{ mb: 0.5 }}>
                            {kindLabel[rec.kind]} · {rec.date} · {ron(rec.value)} · {authorities.get(rec.authority).name} · {rec.title.slice(0, 70)} · <Link href={rec.url} target="_blank">{rec.code} ↗</Link>
                          </Typography>
                        ))}
                      </Box>
                    </Collapse>
                  </TableCell></TableRow>
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Box>
    </Box>
  );
}
