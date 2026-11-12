import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { recordedOverviewSignals } from "../../samples/fixtureData.ts";
import { SignalCard } from "../SignalCard/index.ts";
import { SignalList } from "./index.ts";

const meta = { title: "Domain/SignalList", component: SignalList } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const list =
  (paged: boolean): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <SignalList
        signals={recordedOverviewSignals}
        locale={locale}
        pagination={paged ? { page: 2, pages: 5, pageHref: (n) => `?page=${n}`, copy: sampleCopy.fullResults(locale).pagination } : undefined}
        renderItem={(signal) => (
          <SignalCard
            signal={signal}
            reproduceHref={`/explore/authority/${signal.authority.key}/records`}
            methodologyHref="/explore/methodology"
            entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
            locale={locale}
            copy={sampleCopy.signalCard(locale)}
          />
        )}
      />
    );
  };

/** The recorded Signals of an authority's Overview, newest first, as cards. */
export const Recorded: Story = { render: list(false) };
/** More than one page of Signals: page links under the list. */
export const WithPages: Story = { render: list(true) };
