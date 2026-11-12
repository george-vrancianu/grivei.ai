import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { PageNav, type PageNavCopy } from "../../molecules/PageNav/index.ts";
import { signalKeys } from "../../utils/signalKey.ts";

export interface SignalListPagination {
  /** The current page, 1-based. */
  page: number;
  pages: number;
  pageHref: (page: number) => string;
  onNavigate?: ((href: string) => void) | undefined;
  copy: PageNavCopy;
}

export interface SignalListProps<S> {
  signals: readonly S[];
  /** One Signal's entry (its card, with whatever goes with it): the app wires the card, the list only lays them out. */
  renderItem: (signal: S) => ReactNode;
  /** Shown under the list when there is more than one page of Signals. */
  pagination?: SignalListPagination | undefined;
  locale: Locale;
}

/** Signals as a list of entries, in the order given (by date or by RON, never a score), with page links under it when they run over one page. */
export function SignalList<S extends { rule: string; date: string; reproduce: object; recordCount?: number }>({ signals, renderItem, pagination, locale }: SignalListProps<S>) {
  const keys = signalKeys(signals);
  return (
    <Stack spacing={2}>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", rowGap: 1.5 }}>
        {signals.map((signal, i) => (
          <li key={keys[i]}>{renderItem(signal)}</li>
        ))}
      </Box>
      {pagination && pagination.pages > 1 && <PageNav locale={locale} {...pagination} />}
    </Stack>
  );
}
