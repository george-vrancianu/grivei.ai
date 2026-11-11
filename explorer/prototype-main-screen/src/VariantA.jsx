// PROTOTYPE, throwaway. Variant A: geographic choropleth, flat hits table, detail in a drawer.
import { useMemo, useState } from "react";
import * as d3 from "d3";
import { Box, Chip, Drawer, InputAdornment, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { search, byCounty, coverage, countyName, authorities, suppliers, ron, kindLabel, SOURCES } from "./data";
import { planar, useGeo } from "./geo";
import Detail from "./Detail";

const W = 640, H = 460, N = 50;

export default function VariantA() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("authority");
  const [county, setCounty] = useState(null);
  const [sel, setSel] = useState(null);
  const hits = useMemo(() => search(q, { county, mode }).sort((a, b) => b.value - a.value), [q, county, mode]);
  const all = useMemo(() => search(q, { mode }), [q, mode]);
  const agg = useMemo(() => byCounty(all, mode), [all, mode]);
  const { path } = useGeo(W, H);
  const max = d3.max([...agg.values()], (e) => e.value) || 1;
  const color = d3.scaleSequentialLog(d3.interpolateYlOrBr).domain([Math.max(1, max / 1e4), max]);

  const tile = (key, label) => {
    const e = agg.get(key);
    return (
      <Paper variant="outlined" sx={{ p: 1, flex: 1, cursor: "pointer", borderColor: county === key ? "primary.main" : undefined }}
        onClick={() => setCounty(county === key ? null : key)}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="body2">{e ? `${ron(e.value)} · ${e.n} records` : "nothing yet"}</Typography>
      </Paper>
    );
  };

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Box sx={{ p: 2, display: "flex", gap: 2, alignItems: "center", borderBottom: 1, borderColor: "divider" }}>
        <Typography sx={{ fontFamily: "monospace", fontWeight: 600 }}>grivei.ai</Typography>
        <TextField fullWidth size="small" placeholder="Search authorities, suppliers, CUI, CPV, contract titles…" value={q}
          onChange={(e) => setQ(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> } }} />
      </Box>
      <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", minHeight: 0 }}>
        <Box sx={{ p: 2, overflow: "auto" }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
            <Typography variant="body2">Colour counties by</Typography>
            <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && (setMode(v), setCounty(null))}>
              <ToggleButton value="authority">where it's spent (authority)</ToggleButton>
              <ToggleButton value="supplier">where it goes (supplier)</ToggleButton>
            </ToggleButtonGroup>
            {county && <Chip label={`County: ${countyName.get(county) || county}`} onDelete={() => setCounty(null)} />}
          </Stack>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%">
            {planar.features.map((f) => {
              const iso = f.properties.iso, e = agg.get(iso), cov = coverage(iso);
              return (
                <Tooltip key={iso} followCursor title={
                  <Box>
                    <b>{f.properties.name}</b><br />
                    {e ? `${ron(e.value)} in ${e.n} records` : "no matching records"}<br />
                    {SOURCES.map((s) => `${s}: ${cov[s] ? `${cov[s]} authorit${cov[s] > 1 ? "ies" : "y"} seeded` : "not yet"}`).join(" · ")}
                  </Box>}>
                  <path d={path(f)} fill={e ? color(Math.max(e.value, 1)) : "#262a33"} stroke={county === iso ? "#F2B33D" : "#0f1115"}
                    strokeWidth={county === iso ? 2.5 : 0.8} style={{ cursor: "pointer" }} onClick={() => setCounty(county === iso ? null : iso)} />
                </Tooltip>
              );
            })}
          </svg>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {tile("NAT", "National authorities (not on the map)")}
            {mode === "supplier" && tile("?", "Supplier county unknown")}
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            Seeded: {[...authorities.values()].map((a) => a.name).join(", ")}. Grey = no data yet, not "no spending".
          </Typography>
        </Box>
        <Box sx={{ borderLeft: 1, borderColor: "divider", overflow: "auto" }}>
          <Typography variant="body2" sx={{ p: 2, pb: 1 }} color="text.secondary">
            {hits.length.toLocaleString()} records{q && ` for “${q}”`}{county && ` in ${countyName.get(county) || county}`} · top {Math.min(N, hits.length)} by value
          </Typography>
          <Table size="small" stickyHeader>
            <TableHead><TableRow><TableCell>Record</TableCell><TableCell>Authority → supplier</TableCell><TableCell align="right">RON</TableCell></TableRow></TableHead>
            <TableBody>
              {hits.slice(0, N).map((r) => (
                <TableRow key={r.i} hover sx={{ cursor: "pointer" }} onClick={() => setSel({ type: "record", id: r.i })}>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Chip size="small" variant="outlined" label={kindLabel[r.kind]} sx={{ mr: 1 }} />
                    <Typography variant="body2" component="span">{r.title.slice(0, 90)}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">{r.date} · {r.code}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">{authorities.get(r.authority).name}</Typography>
                    <Typography variant="caption" display="block" color="primary">{r.suppliers.map((c) => suppliers.get(c)?.name).join(" + ")}</Typography>
                  </TableCell>
                  <TableCell align="right">{ron(r.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Box>
      <Drawer anchor="right" open={!!sel} onClose={() => setSel(null)}>
        <Box sx={{ width: 460, p: 3 }}><Detail sel={sel} /></Box>
      </Drawer>
    </Box>
  );
}
