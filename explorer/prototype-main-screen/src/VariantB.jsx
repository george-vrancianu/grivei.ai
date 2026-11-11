// PROTOTYPE, throwaway. Variant B: search-first hero, tile-grid cartogram showing per-Source coverage,
// results split by kind in tabs, drill-down replaces the right pane (master-detail).
import { useMemo, useState } from "react";
import { Box, Button, InputBase, List, ListItemButton, ListItemText, Paper, Tab, Tabs, Typography, Stack } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { search, byCounty, coverage, countyName, authorities, suppliers, aggregateSuppliers, ron, kindLabel, SOURCES } from "./data";
import { tileGrid } from "./geo";
import Detail from "./Detail";

const COLS = 10, ROWS = 8, S = 62;
const grid = tileGrid(COLS, ROWS);
const fold = (s) => (s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function VariantB() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState(0);
  const [county, setCounty] = useState(null);
  const [sel, setSel] = useState(null);
  const recs = useMemo(() => search(q, { county }), [q, county]);
  const agg = useMemo(() => byCounty(search(q), "authority"), [q]);
  const t = fold(q).trim();
  const auths = [...authorities.values()].filter((a) => (!t || fold(a.name + " " + a.cui).includes(t)) && (!county || a.county === county));
  const sups = useMemo(() => aggregateSuppliers(recs).filter((s) => !t || fold(suppliers.get(s.cui)?.name + " " + s.cui).includes(t)), [recs, t]);
  const lists = [
    { label: `Authorities (${auths.length})`, items: auths.map((a) => ({ key: a.cui, primary: a.name, secondary: `CUI ${a.cui} · ${countyName.get(a.county)}`, sel: { type: "authority", id: a.cui } })) },
    { label: `Suppliers (${sups.length})`, items: sups.slice(0, 50).map((s) => ({ key: s.cui, primary: suppliers.get(s.cui)?.name, secondary: `${ron(s.value)} · ${s.n} records · ${countyName.get(suppliers.get(s.cui)?.county) || "county unknown"}`, sel: { type: "supplier", id: s.cui } })) },
    { label: `Records (${recs.length})`, items: [...recs].sort((a, b) => b.value - a.value).slice(0, 50).map((r) => ({ key: r.i, primary: r.title, secondary: `${kindLabel[r.kind]} · ${ron(r.value)} · ${r.date}`, sel: { type: "record", id: r.i } })) },
  ];

  return (
    <Box sx={{ height: "100vh", display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)" }}>
      <Box sx={{ p: 4, overflow: "auto" }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Where does public money go?</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Search an institution, a company, a CUI or what was bought.</Typography>
        <Paper sx={{ display: "flex", alignItems: "center", px: 2, py: 1, borderRadius: 999, mb: 3 }}>
          <SearchIcon sx={{ mr: 1 }} /><InputBase fullWidth autoFocus placeholder="e.g. COMPREST, deszăpezire, 1095130" value={q} onChange={(e) => { setQ(e.target.value); setSel(null); }} />
        </Paper>
        <svg viewBox={`0 0 ${COLS * S} ${ROWS * S}`} width="100%">
          {[...grid.entries()].map(([iso, [c, r]]) => {
            const cov = coverage(iso), e = agg.get(iso), on = county === iso, dim = q && !e;
            return (
              <g key={iso} transform={`translate(${c * S},${r * S})`} style={{ cursor: "pointer", opacity: dim ? 0.3 : 1 }} onClick={() => setCounty(on ? null : iso)}>
                <title>{countyName.get(iso)}{e ? ` · ${ron(e.value)}` : ""}</title>
                <rect x={2} y={2} width={S - 4} height={S - 4} rx={6} fill={e ? "#3a2f17" : "#1d2028"} stroke={on ? "#F2B33D" : "#2c313c"} strokeWidth={on ? 2.5 : 1} />
                <text x={8} y={20} fill="#e8e8e8" fontSize={13} fontWeight={700} fontFamily="monospace">{iso.slice(3)}</text>
                {e && <text x={8} y={38} fill="#F2B33D" fontSize={10} fontFamily="monospace">{ron(e.value).replace(" RON", "")}</text>}
                {SOURCES.map((s, k) => (
                  <circle key={s} cx={10 + k * 10} cy={S - 12} r={3.5} fill={cov[s] ? "#F2B33D" : "none"} stroke={cov[s] ? "#F2B33D" : "#555"} />
                ))}
              </g>
            );
          })}
        </svg>
        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">Dots, left to right: {SOURCES.join(" · ")} (filled = seeded for an authority in that county)</Typography>
        </Stack>
        <Paper variant="outlined" sx={{ mt: 2, p: 1.5, display: "inline-block" }}>
          <Typography variant="caption" color="text.secondary">NATIONAL (ministries, agencies, national companies)</Typography>
          <Typography variant="body2">not seeded yet</Typography>
        </Paper>
      </Box>
      <Box sx={{ borderLeft: 1, borderColor: "divider", overflow: "auto", bgcolor: "background.paper" }}>
        {sel ? (
          <Box sx={{ p: 3 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => setSel(null)} sx={{ mb: 2 }}>Back to results</Button>
            <Detail sel={sel} />
          </Box>
        ) : (
          <>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">{lists.map((l) => <Tab key={l.label} label={l.label} />)}</Tabs>
            {county && <Typography variant="body2" sx={{ px: 2, pt: 1 }}>Filtered to {countyName.get(county)} · <a href="#" onClick={(e) => { e.preventDefault(); setCounty(null); }}>clear</a></Typography>}
            <List dense>
              {lists[tab].items.map((it) => (
                <ListItemButton key={it.key} onClick={() => setSel(it.sel)}>
                  <ListItemText primary={it.primary} secondary={it.secondary} />
                </ListItemButton>
              ))}
              {!lists[tab].items.length && <Typography sx={{ p: 2 }} color="text.secondary">No hits.</Typography>}
            </List>
          </>
        )}
      </Box>
    </Box>
  );
}
