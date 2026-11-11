// PROTOTYPE, throwaway. Small pieces shared by the entity-page variants (header, Flow lens, signal chip).
import { useMemo } from "react";
import * as d3 from "d3";
import { Box, Chip, Link, Stack, Tooltip, Typography } from "@mui/material";
import { authorities, suppliers, countyName, ron } from "./data";
import { planar, useGeo } from "./geo";
import { SIGNALS } from "./entity";

export function TopBar({ p }) {
  return (
    <Stack direction="row" spacing={2} sx={{ alignItems: "center", px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
      <Link href="#/" underline="none" sx={{ fontFamily: "monospace", fontWeight: 600, color: "text.primary" }}>grivei.ai</Link>
      <Typography variant="body2" color="text.secondary">
        <Link href="#/" color="inherit">Explore</Link> / {p.type === "supplier" ? "Supplier" : "Contracting authority"} / CUI {p.id}
      </Typography>
      <Box sx={{ flex: 1 }} />
      <Typography variant="caption" color="text.secondary">Source: SEAP · harvested for Brașov and Timișoara only</Typography>
    </Stack>
  );
}

export function SignalChip({ k, size = "small" }) {
  return (
    <Tooltip title={`${SIGNALS[k].help} (${SIGNALS[k].view})`}>
      <Chip size={size} label={SIGNALS[k].short} variant="outlined" color="warning" sx={{ mr: 0.5 }} />
    </Tooltip>
  );
}

export const SEAP = ({ r, children }) => <Link href={r.url} target="_blank" rel="noreferrer">{children || `${r.code} ↗`}</Link>;

export const entityName = (type, id) => (type === "supplier" ? suppliers.get(id)?.name : authorities.get(id)?.name) || id;
export const place = (ent) => countyName.get(ent?.county) || "county unknown";

/** Flow lens: where this entity's money comes from (supplier page) or goes (authority page). */
export function FlowMap({ p, w = 520, h = 380 }) {
  const { path, centroid } = useGeo(w, h);
  const isSup = p.type === "supplier";
  const home = p.ent.county;
  const { buckets, unknown } = useMemo(() => {
    const m = new Map(); let unknown = 0;
    for (const c of p.counterparties) {
      const iso = isSup ? authorities.get(c.id)?.county : suppliers.get(c.id)?.county;
      if (!iso) { unknown += c.value; continue; }
      m.set(iso, (m.get(iso) || 0) + c.value);
    }
    return { buckets: [...m.entries()], unknown };
  }, [p]);
  const r = d3.scaleSqrt().domain([0, d3.max(buckets, (b) => b[1]) || 1]).range([3, 30]);
  const wd = d3.scaleLinear().domain([0, d3.max(buckets, (b) => b[1]) || 1]).range([1, 9]);
  return (
    <Box>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%">
        {planar.features.map((f) => <path key={f.properties.iso} d={path(f)} fill={f.properties.iso === home ? "#3a2f17" : "#1d2028"} stroke="#2c313c" />)}
        {home && centroid.has(home) && buckets.filter(([iso]) => iso !== home).map(([iso, v]) => {
          const [x1, y1] = centroid.get(isSup ? iso : home), [x2, y2] = centroid.get(isSup ? home : iso);
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - Math.hypot(x2 - x1, y2 - y1) * 0.25;
          return <path key={iso} d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`} fill="none" stroke="#F2B33D" strokeOpacity={0.5} strokeWidth={wd(v)} />;
        })}
        {buckets.map(([iso, v]) => {
          const [x, y] = centroid.get(iso) || [];
          return x == null ? null : <circle key={iso} cx={x} cy={y} r={r(v)} fill={isSup ? "#F2B33D" : "#4fa3ff"} fillOpacity={0.6} stroke="#fff" strokeWidth={0.5}>
            <title>{countyName.get(iso)}: {ron(v)}</title></circle>;
        })}
      </svg>
      <Typography variant="caption" color="text.secondary">
        {isSup ? "Where its money comes from: paying authorities by county; arcs into the supplier's registered county." : "Where its money goes: suppliers by registered county."}
        {unknown > 0 && ` ${ron(unknown)} ${isSup ? "from authorities" : "to suppliers"} whose county we don't know yet.`}
      </Typography>
    </Box>
  );
}

export const Footnote = () => (
  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
    Signals are queries worth verifying in the source documents, never conclusions. Consortium contracts are counted as equal shares per member.
    Framework agreements appear at their maximum value.
  </Typography>
);
