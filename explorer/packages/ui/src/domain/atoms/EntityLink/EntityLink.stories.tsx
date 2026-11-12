import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "../../../atoms/Box/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { curatedEntity, cuiParty, longNameEntity, nameOnlyParty } from "../../samples/fixtureData.ts";
import { EntityLink } from "./index.ts";

const meta = { title: "Domain/EntityLink", component: EntityLink } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const hrefOf = (key: string) => `/explore/supplier/${encodeURIComponent(key)}`;

export const Typical: Story = {
  render: (_args, { globals }) => <EntityLink entity={cuiParty.entity!} href={hrefOf(cuiParty.entity!.key)} copy={sampleCopy.entityLink(localeOf(globals["locale"]))} />,
};
export const NameOnly: Story = {
  render: (_args, { globals }) => <EntityLink entity={nameOnlyParty.entity!} href={hrefOf(nameOnlyParty.entity!.key)} copy={sampleCopy.entityLink(localeOf(globals["locale"]))} />,
};
export const IdentityCurated: Story = {
  render: (_args, { globals }) => <EntityLink entity={curatedEntity} identityCurated={curatedEntity.identityCurated} href={hrefOf(curatedEntity.key)} copy={sampleCopy.entityLink(localeOf(globals["locale"]))} />,
};
export const NameOnlyAndCurated: Story = {
  render: (_args, { globals }) => <EntityLink entity={nameOnlyParty.entity!} identityCurated href={hrefOf(nameOnlyParty.entity!.key)} copy={sampleCopy.entityLink(localeOf(globals["locale"]))} />,
};
export const LongRomanianName: Story = {
  render: (_args, { globals }) => (
    <Box sx={{ maxWidth: 260 }}>
      <EntityLink entity={longNameEntity} href={hrefOf(longNameEntity.key)} copy={sampleCopy.entityLink(localeOf(globals["locale"]))} />
    </Box>
  ),
};
