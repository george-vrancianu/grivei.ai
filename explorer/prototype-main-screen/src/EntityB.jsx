// PROTOTYPE, throwaway. Entity variant B, "Ledger": the records table *is* the page.
// A facet rail (channel, procedure, year, counterparty, Signal) filters it; totals follow the filters.
import { useMemo, useState } from "react";
import { Box, Checkbox, Link, List, ListItemButton, ListItemText, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, Typography } from "@mui/material";
import { ron, kindLabel, authorities, suppliers } from "./data";
import { SIGNALS, href } from "./entity";
import { TopBar, SignalChip, SEAP, FlowMap, Footnote, place } from "./shared";

function Facet({ title, items, sel, toggle }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="overline" color="text.secondary">{title}</Typography>
      <List dense disablePadding>
        {items.map((it) => (
          <ListItemButton key={it.key} dense onClick={() => toggle(it.key)} sx={{ py: 0, px: 0.5 }}>
            <Checkbox size="small" checked={sel.has(it.key)} sx={{ p: 0.5 }} />
            <ListItemText primary={it.label} secondary={`${it.n} · ${ron(it.value)}`}
              slotProps={{ primary: { variant: "body2", noWrap: true, title: it.label }, secondary: { variant: "caption" } }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

const facetOf = {
  kind: (r) => [r.kind],
  proc: (r) => [r.proc],
  year: (r) => [r.date.slice(0, 4)],
};

export default function EntityB({ p }) {
  const isSup = p.type === "supplier";
  const other = isSup ? "authority" : "supplier";
  const cpOf = (r) => (isSup ? [r.authority] : r.suppliers);
  const [sel, setSel] = useState({ kind: new Set(), proc: new Set(), year: new Set(), cp: new Set(), sig: new Set() });
  const [sort, setSort] = useState("value");
  const toggle = (f) => (k) => setSel((s) => { const n = new Set(s[f]); n.has(k) ? n.delete(k) : n.add(k); return { ...s, [f]: n }; });
  const fns = { ...facetOf, cp: cpOf, sig: (r) => p.flags.get(r.i) };
  const pass = (r, skip) => Object.entries(sel).every(([f, s]) => f === skip || s.size === 0 || fns[f](r).some((k) => s.has(k)));
  const rows = useMemo(() => p.recs.filter((r) => pass(r)).sort((a, b) => (sort === "value" ? b.value - a.value : b.date.localeCompare(a.date))), [p, sel, sort]);
  const total = rows.reduce((s, r) => s + p.share(r), 0);

  // facet counts ignore their own selection, so you can widen as well as narrow
  const items = (f, label = (k) => k, limit = 99) => {
    const m = new Map();
    for (const r of p.recs) if (pass(r, f)) for (const k of fns[f](r)) {
      const e = m.get(k) || { key: k, label: label(k), n: 0, value: 0 }; e.n++; e.value += p.share(r); m.set(k, e);
    }
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, limit);
  };
  const cpName = (c) => (isSup ? authorities.get(c)?.name : suppliers.get(c)?.name) || c;

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar p={p} />
      <Stack direction="row" sx={{ alignItems: "baseline", gap: 2, px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Typography variant="h5">{p.ent.name}</Typography>
        <Typography color="text.secondary">CUI {p.id} · {place(p.ent)}</Typography>
        <Box sx={{ flex: 1 }} />
        <Typography><b>{ron(total)}</b> in {rows.length} of {p.recs.length} records {isSup ? "received" : "spent"}</Typography>
      </Stack>
      <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: "300px 1fr", minHeight: 0 }}>
        <Box sx={{ p: 2, overflow: "auto", borderRight: 1, borderColor: "divider" }}>
          <Facet title="Signals" sel={sel.sig} toggle={toggle("sig")}
            items={Object.keys(SIGNALS).map((k) => items("sig").find((x) => x.key === k) || { key: k, n: 0, value: 0 }).map((x) => ({ ...x, label: SIGNALS[x.key].short }))} />
          <Facet title="Channel" items={items("kind", (k) => kindLabel[k])} sel={sel.kind} toggle={toggle("kind")} />
          <Facet title="Procedure" items={items("proc")} sel={sel.proc} toggle={toggle("proc")} />
          <Facet title="Year" items={items("year").sort((a, b) => a.key.localeCompare(b.key))} sel={sel.year} toggle={toggle("year")} />
          <Facet title={isSup ? "Paying authority" : "Supplier (top 15)"} items={items("cp", cpName, 15)} sel={sel.cp} toggle={toggle("cp")} />
          {isSup && <><Typography variant="overline" color="text.secondary">Flow lens</Typography><FlowMap p={p} w={260} h={190} /></>}
          <Footnote />
        </Box>
        <Box sx={{ overflow: "auto", pb: 8 }}>
          <Table size="small" stickyHeader>
            <TableHead><TableRow>
              <TableCell><TableSortLabel active={sort === "date"} direction="desc" onClick={() => setSort("date")}>Date</TableSortLabel></TableCell>
              <TableCell>Record</TableCell>
              <TableCell>{isSup ? "Paid by" : "Paid to"}</TableCell>
              <TableCell>Procedure</TableCell>
              <TableCell align="right"><TableSortLabel active={sort === "value"} direction="desc" onClick={() => setSort("value")}>RON</TableSortLabel></TableCell>
              <TableCell>Source</TableCell>
            </TableRow></TableHead>
            <TableBody>{rows.slice(0, 200).map((r) => (
              <TableRow key={r.i} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{r.date}</TableCell>
                <TableCell><Link href={href.record(r.i)} variant="body2">{r.title.slice(0, 80)}</Link>
                  <Box>{p.flags.get(r.i).map((k) => <SignalChip key={k} k={k} />)}</Box></TableCell>
                <TableCell>{cpOf(r).map((c) => <Link key={c} href={href[other](c)} variant="body2" sx={{ display: "block" }}>{cpName(c).slice(0, 40)}</Link>)}</TableCell>
                <TableCell><Typography variant="caption">{r.proc}</Typography></TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{ron(r.value)}{r.suppliers.length > 1 && <Typography variant="caption" display="block" color="text.secondary">÷{r.suppliers.length} consortium</Typography>}</TableCell>
                <TableCell><SEAP r={r} /></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
          {rows.length > 200 && <Typography variant="caption" sx={{ p: 2, display: "block" }}>Showing 200 of {rows.length}.</Typography>}
        </Box>
      </Box>
    </Box>
  );
}
