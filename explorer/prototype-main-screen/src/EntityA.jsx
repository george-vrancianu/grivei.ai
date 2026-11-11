// PROTOTYPE, throwaway. Entity variant A, "Dossier": one long report page, read top to bottom.
// Headline numbers → Signals up front → Flow / concentration → channels and procedures → consortia → largest records.
import { Box, Container, Divider, Grid, LinearProgress, Link, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { ron, kindLabel, authorities, suppliers } from "./data";
import { SIGNALS, href } from "./entity";
import { TopBar, SignalChip, SEAP, FlowMap, Footnote, place } from "./shared";

const H = ({ children, sub }) => (<Box sx={{ mt: 5, mb: 1.5 }}><Typography variant="h6">{children}</Typography>{sub && <Typography variant="body2" color="text.secondary">{sub}</Typography>}</Box>);

function Stat({ label, value, sub }) {
  return (<Paper variant="outlined" sx={{ p: 1.5, height: "100%" }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="h6">{value}</Typography>
    {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
  </Paper>);
}

export default function EntityA({ p }) {
  const isSup = p.type === "supplier";
  const other = isSup ? "authority" : "supplier";
  const dv = p.channels.direct.reduce((s, r) => s + p.share(r), 0);
  const nSig = p.signals.over.length + p.signals.split.length + p.signals.noncomp.length;
  return (
    <Box>
      <TopBar p={p} />
      <Container maxWidth="md" sx={{ py: 4, pb: 12 }}>
        <Typography variant="overline" color="text.secondary">{isSup ? "Supplier" : "Contracting authority"}</Typography>
        <Typography variant="h4">{p.ent.name}</Typography>
        <Typography color="text.secondary">CUI {p.id} · {place(p.ent)} · records {p.years[0]}–{p.years.at(-1)}</Typography>

        <Grid container spacing={1.5} sx={{ mt: 2 }}>
          <Grid size={3}><Stat label={isSup ? "Received" : "Spent"} value={ron(p.total)} sub={`${p.recs.length} records`} /></Grid>
          <Grid size={3}><Stat label={isSup ? "Paying authorities" : "Suppliers"} value={p.counterparties.length} sub={`top 1 takes ${(100 * p.top(1)).toFixed(0)}%`} /></Grid>
          <Grid size={3}><Stat label="Via direct purchase" value={`${(100 * dv / (p.total || 1)).toFixed(0)}%`} sub={`${p.channels.direct.length} of ${p.recs.length} records`} /></Grid>
          <Grid size={3}><Stat label="Signals" value={nSig} sub="to verify on SEAP" /></Grid>
        </Grid>

        <H sub="Each is a query worth checking in the source document. None is a finding.">Signals</H>
        {Object.entries(SIGNALS).map(([k, s]) => {
          const list = p.signals[k];
          return (
            <Paper key={k} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
              <Stack direction="row" sx={{ alignItems: "baseline", gap: 1 }}>
                <Typography variant="subtitle2">{s.label}</Typography>
                <Typography variant="caption" color="text.secondary">({s.view})</Typography>
                <Box sx={{ flex: 1 }} />
                <Typography variant="subtitle2" color={list.length ? "warning.main" : "text.secondary"}>{list.length || "none found"}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">{s.help}</Typography>
              {k === "split" ? list.slice(0, 5).map((g, j) => (
                <Typography key={j} variant="body2" sx={{ mt: 0.75 }}>
                  {g.month} · {g.recs.length} purchases · <b>{ron(g.total)}</b> together (threshold {ron(g.threshold)}) · {isSup ? authorities.get(g.authority).name : suppliers.get(g.supplier)?.name} · {g.cpv.slice(0, 50)}
                  <br /><Typography component="span" variant="caption">{g.recs.map((r) => <span key={r.i}><SEAP r={r} /> </span>)}</Typography>
                </Typography>
              )) : list.slice(0, 5).map((r) => (
                <Typography key={r.i} variant="body2" sx={{ mt: 0.75 }}>
                  {r.date} · <b>{ron(r.value)}</b> · <Link href={href.record(r.i)}>{r.title.slice(0, 80)}</Link> · <SEAP r={r} />
                </Typography>
              ))}
              {list.length > 5 && <Typography variant="caption">+ {list.length - 5} more</Typography>}
            </Paper>
          );
        })}

        {isSup && <><H sub="The Flow lens">Where the money comes from</H><FlowMap p={p} /></>}

        <H sub={`Share of ${ron(p.total)}. Top 5 take ${(100 * p.top(5)).toFixed(0)}%, top 10 take ${(100 * p.top(10)).toFixed(0)}%.`}>
          {isSup ? "Who pays it" : "Who it pays"}
        </H>
        {p.counterparties.slice(0, 12).map((c) => (
          <Box key={c.id} sx={{ display: "grid", gridTemplateColumns: "1fr 140px 110px", gap: 1, alignItems: "center", py: 0.5 }}>
            <Link href={href[other](c.id)} variant="body2" noWrap>{c.name}</Link>
            <LinearProgress variant="determinate" value={(100 * c.value) / p.total} />
            <Typography variant="body2" align="right">{ron(c.value)}</Typography>
          </Box>
        ))}
        {p.counterparties.length > 12 && <Typography variant="caption" color="text.secondary">+ {p.counterparties.length - 12} more</Typography>}

        <H sub="Direct purchases skip competition by law below the threshold; contracts come from a procedure.">How the money moves</H>
        <Table size="small">
          <TableHead><TableRow><TableCell>Procedure</TableCell><TableCell align="right">Records</TableCell><TableCell align="right">RON</TableCell><TableCell align="right">Share</TableCell></TableRow></TableHead>
          <TableBody>{p.byProc.map((x) => (
            <TableRow key={x.proc}><TableCell>{x.proc} {/negociere fara/i.test(x.proc) && <SignalChip k="noncomp" />}</TableCell>
              <TableCell align="right">{x.n}</TableCell><TableCell align="right">{ron(x.value)}</TableCell><TableCell align="right">{(100 * x.value / (p.total || 1)).toFixed(1)}%</TableCell></TableRow>
          ))}</TableBody>
        </Table>

        <H sub={isSup ? "Contracts won together with other suppliers; value counted as an equal share." : "Contracts awarded to several suppliers jointly."}>Consortia</H>
        {p.consortia.length === 0 ? <Typography variant="body2" color="text.secondary">None in the harvested records.</Typography> :
          isSup ? p.partners.slice(0, 10).map((x) => (
            <Typography key={x.id} variant="body2" sx={{ py: 0.25 }}>
              <Link href={href.supplier(x.id)}>{x.name}</Link> · together on {x.n} contract{x.n > 1 && "s"}: {x.recs.map((r) => <span key={r.i}><SEAP r={r} /> </span>)}
            </Typography>
          )) : p.consortia.slice(0, 10).map((r) => (
            <Typography key={r.i} variant="body2" sx={{ py: 0.25 }}>
              {ron(r.value)} · {r.suppliers.map((c) => suppliers.get(c)?.name).join(" + ")} · <SEAP r={r} />
            </Typography>
          ))}

        <H>Largest records</H>
        <Table size="small">
          <TableBody>{p.recs.slice(0, 15).map((r) => (
            <TableRow key={r.i}>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{r.date}</TableCell>
              <TableCell><Link href={href.record(r.i)}>{r.title.slice(0, 90)}</Link>
                <Typography variant="caption" display="block" color="text.secondary">{kindLabel[r.kind]} · {isSup ? authorities.get(r.authority).name : r.suppliers.map((c) => suppliers.get(c)?.name).join(" + ")}</Typography></TableCell>
              <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{ron(r.value)}</TableCell>
              <TableCell><SEAP r={r} /></TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
        <Divider sx={{ mt: 3 }} />
        <Footnote />
      </Container>
    </Box>
  );
}
