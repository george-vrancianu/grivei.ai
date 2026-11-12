import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { authorityHeader, nationalAuthorityHeader, unplacedAuthorityHeader } from "../../../../samples/fixtureData.ts";
import { PlacementLine } from "./index.ts";

const meta = { title: "Domain/EntityHeader/PlacementLine", component: PlacementLine } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const line = (entity: typeof authorityHeader): Story => ({
  render: (_args, { globals }) => <PlacementLine entity={entity} copy={sampleCopy.entityHeader(localeOf(globals["locale"])).placement} />,
});

export const CountyAndUat = line(authorityHeader);
export const National = line(nationalAuthorityHeader);
export const Unplaced = line(unplacedAuthorityHeader);
export const CountyOnly = line({ ...authorityHeader, placement: { county: { code: "RO-BV", name: "Brașov" }, uat: null, national: false, placedBy: "SEAP" } });
