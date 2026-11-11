// PROTOTYPE, throwaway. Drill-down content shared by the variants.
import { Box, Chip, Link, Stack, Typography, Divider } from "@mui/material";
import { authorities, suppliers, records, countyName, ron, kindLabel } from "./data";
import { href } from "./entity";

function RecordLine({ r }) {
  return (
    <Box sx={{ py: 0.75 }}>
      <Typography variant="body2">{r.title}</Typography>
      <Typography variant="caption" color="text.secondary">
        {kindLabel[r.kind]} · {r.date} · {ron(r.value)} · <Link href={r.url} target="_blank">{r.code} on SEAP ↗</Link>
      </Typography>
    </Box>
  );
}

export default function Detail({ sel }) {
  if (!sel) return null;
  if (sel.type === "record") {
    const r = records[sel.id];
    return (
      <Stack spacing={1}>
        <Chip size="small" label={kindLabel[r.kind]} sx={{ alignSelf: "start" }} />
        <Typography variant="h6">{r.title}</Typography>
        <Link href={href.record(sel.id)}>Open the record page →</Link>
        <Typography variant="body2"><b>{ron(r.value)}</b> · {r.date} · {r.proc}</Typography>
        <Typography variant="body2">Authority: <Link href={href.authority(r.authority)}>{authorities.get(r.authority).name}</Link></Typography>
        <Typography variant="body2">Supplier(s): {r.suppliers.map((c) => <Link key={c} href={href.supplier(c)} sx={{ mr: 1 }}>{suppliers.get(c)?.name} (CUI {c})</Link>)}</Typography>
        <Typography variant="body2" color="text.secondary">{r.cpv}</Typography>
        <Link href={r.url} target="_blank">Source document: {r.code} on e-licitatie.ro ↗</Link>
      </Stack>
    );
  }
  const isSup = sel.type === "supplier";
  const ent = isSup ? suppliers.get(sel.id) : authorities.get(sel.id);
  const recs = records.filter((r) => (isSup ? r.suppliers.includes(sel.id) : r.authority === sel.id)).sort((a, b) => b.value - a.value);
  const total = recs.reduce((s, r) => s + r.value / r.suppliers.length, 0);
  return (
    <Stack spacing={1}>
      <Chip size="small" label={isSup ? "Supplier" : "Contracting authority"} sx={{ alignSelf: "start" }} />
      <Typography variant="h6">{ent.name}</Typography>
      <Link href={href[sel.type](sel.id)}>Open the full page →</Link>
      <Typography variant="body2">CUI {ent.cui} · {countyName.get(ent.county) || "county unknown"}</Typography>
      <Typography variant="body2"><b>{ron(total)}</b> across {recs.length} records
        ({recs.filter((r) => r.kind === "contract").length} contracts, {recs.filter((r) => r.kind === "direct").length} direct purchases)</Typography>
      <Divider />
      <Typography variant="overline">Largest records</Typography>
      {recs.slice(0, 8).map((r) => <RecordLine key={r.i} r={r} />)}
      <Typography variant="caption" color="text.secondary">Signals, not conclusions: verify each in its source document.</Typography>
    </Stack>
  );
}
