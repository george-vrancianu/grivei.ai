import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { StateNote } from "../../molecules/StateNote/index.ts";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import {
  authorityHome, authorityLocalFlow, authorityNationwideFlow, emptyAuthorityFlow, emptySupplierFlow, supplierHome, supplierLocalFlow, supplierNationwideFlow,
} from "../../samples/flowMaps.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import type { EntityRole, MoneyMap } from "../../types.ts";
import type { MapArea } from "../MoneyLensMap/index.ts";
import { FlowLensMap } from "./index.ts";
import { onPanel } from "../../../workbench/index.ts";

const meta = { title: "Domain/FlowLensMap", decorators: [onPanel] } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

/** The selection lives in the URL in the app; the stories hold it in state so clicking works. */
function Lens({ locale, flow, role, home, selected: initial, busy = false }: { locale: "en" | "ro"; flow: MoneyMap; role: EntityRole; home: string | null; selected?: MapArea; busy?: boolean }) {
  const [selected, setSelected] = useState<MapArea | undefined>(initial);
  return (
    <Box sx={{ maxWidth: 820 }}>
      <FlowLensMap flow={flow} role={role} home={home} topology={countiesTopology} selected={selected} onSelect={setSelected} locale={locale} copy={sampleCopy.flowLensMap(locale)} busy={busy} status={busy ? <LoadingStatus label={locale === "ro" ? "Se încarcă…" : "Loading…"} /> : undefined} />
    </Box>
  );
}

const story = (flow: MoneyMap, role: EntityRole, home: string | null, selected?: MapArea, busy = false): Story => ({
  render: (_args, { globals }) => <Lens locale={localeOf(globals["locale"])} flow={flow} role={role} home={home} selected={selected} busy={busy} />,
});

/** A supplier in Cluj: arcs flow in from the authority counties; National and Unplaced tiles. */
export const SupplierNationwide: Story = story(supplierNationwideFlow, "supplier", supplierHome);
/** All of the supplier's money comes from its own county: one bubble, no arcs. */
export const SupplierLocalOnly: Story = story(supplierLocalFlow, "supplier", supplierHome);
/** An authority in Brașov: arcs flow out to the supplier counties; the unknown-supplier-county bucket. */
export const AuthorityNationwide: Story = story(authorityNationwideFlow, "authority", authorityHome);
export const AuthorityLocalOnly: Story = story(authorityLocalFlow, "authority", authorityHome);
/** No home county is known: bubbles only, and the caption says so. */
export const NoHomeCounty: Story = story(authorityNationwideFlow, "authority", null);
export const SelectedCounty: Story = story(supplierNationwideFlow, "supplier", supplierHome, "RO-BV");
export const SelectedTile: Story = story(authorityNationwideFlow, "authority", authorityHome, "UNKNOWN_SUPPLIER_COUNTY");
export const EmptyAuthority: Story = story(emptyAuthorityFlow, "authority", authorityHome);
export const EmptySupplier: Story = story(emptySupplierFlow, "supplier", supplierHome);
/** A refetch (a filter changed): the last map and list stay, dimmed with aria-busy, the loading status in the header. */
export const Refetching: Story = story(authorityNationwideFlow, "authority", authorityHome, undefined, true);
/** A reload failed while the map is held: the note sits in the panel above the held map and list. */
export const FailedWithHeldMap: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <Box sx={{ maxWidth: 820 }}>
        <FlowLensMap
          flow={authorityNationwideFlow} role="authority" home={authorityHome} topology={countiesTopology} onSelect={() => undefined} locale={locale} copy={sampleCopy.flowLensMap(locale)}
          failure={<StateNote kind="error">{locale === "ro" ? "Datele nu au putut fi încărcate." : "The data could not be loaded."}</StateNote>}
        />
      </Box>
    );
  },
};
