import { Box, type SignalData } from "@grivei/ui";
import type { SignalWiring } from "./useSignals.tsx";

export interface SignalListProps {
  signals: readonly (SignalData & { records: readonly { code: string; provenance?: { url: string | null } | null }[] })[];
  wiring: SignalWiring;
}

/** An entity's Signals as cards, in the order the API sent (by date or by RON, never a score). */
export function SignalList({ signals, wiring }: SignalListProps) {
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", rowGap: 1.5 }}>
      {signals.map((signal) => (
        <li key={`${signal.rule}-${signal.authority.key}-${signal.date}-${signal.reproduce.supplier ?? ""}-${signal.reproduce.cpv ?? ""}-${signal.reproduce.from ?? ""}`}>{wiring.card(signal, signal.records)}</li>
      ))}
    </Box>
  );
}
