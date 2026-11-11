// PROTOTYPE, throwaway. Minimal record page (one SEAP contract or direct purchase); not a variant.
import { Box, Container, Link, Typography } from "@mui/material";
import { records, authorities, suppliers, ron, kindLabel } from "./data";
import { href, profile } from "./entity";
import { SignalChip, SEAP } from "./shared";

export default function RecordPage({ i }) {
  const r = records[i];
  const flags = profile("authority", r.authority).flags.get(r.i);
  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Link href="#/">grivei.ai</Link>
      <Typography variant="overline" display="block" sx={{ mt: 2 }}>{kindLabel[r.kind]} · {r.code}</Typography>
      <Typography variant="h5">{r.title}</Typography>
      <Box sx={{ my: 1 }}>{flags.map((k) => <SignalChip key={k} k={k} />)}</Box>
      <Typography><b>{ron(r.value)}</b> · {r.date} · {r.proc}</Typography>
      <Typography>Paid by <Link href={href.authority(r.authority)}>{authorities.get(r.authority).name}</Link></Typography>
      <Typography>Paid to {r.suppliers.map((c) => <Link key={c} href={href.supplier(c)} sx={{ mr: 1 }}>{suppliers.get(c)?.name}</Link>)}</Typography>
      <Typography color="text.secondary">{r.cpv}</Typography>
      <Typography sx={{ mt: 2 }}>Source document: <SEAP r={r}>{r.code} on e-licitatie.ro ↗</SEAP></Typography>
    </Container>
  );
}
