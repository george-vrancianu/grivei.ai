import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../../atoms/Button/index.ts";
import { pick } from "../../../workbench/index.ts";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import type { EntityRole } from "../../types.ts";
import { RelationshipsTabSkeleton } from "./index.ts";

const meta = { title: "Domain/RelationshipsTabSkeleton", component: RelationshipsTabSkeleton } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const sample =
  (role: EntityRole, view: "graph" | "flow", picked = false): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <RelationshipsTabSkeleton
        role={role}
        view={view}
        picked={picked}
        toggle={<Button variant="outlined" size="small">{locale === "ro" ? "Flux de bani" : "Money flow"}</Button>}
        status={<LoadingStatus label={pick(globals["locale"], { en: "Loading…", ro: "Se încarcă…" })} />}
        copy={{ ...sampleCopy.relationshipsTab(locale), flow: sampleCopy.flowLensMap(locale).panel }}
      />
    );
  };

/** The Graph view on first load: the heading and toggle, the real panel titles over blocks, the picked panel's hint, the status in the graph panel's header. */
export const GraphFirstLoad: Story = { render: sample("authority", "graph") };
/** A counterparty is in the URL: the picked panel shows its real figure labels over blocks. */
export const WithPickedCounterparty: Story = { render: sample("supplier", "graph", true) };
/** The Money flow view on first load: its panel in the graph's place (a block where the map will be), the picked panel and By month as in the Graph view. */
export const MoneyFlowFirstLoad: Story = { render: sample("authority", "flow") };
export const Phone: Story = { ...GraphFirstLoad, globals: { viewport: { value: "mobile2", isRotated: false } } };
