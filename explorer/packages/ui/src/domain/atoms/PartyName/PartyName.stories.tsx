import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { consortiumParties, cuiParty, naturalPersonParty, nameOnlyParty } from "../../samples/fixtureData.ts";
import { PartyName } from "./index.ts";

const meta = { title: "Domain/PartyName", component: PartyName } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const hrefOf = (entity: { key: string }) => `/explore/supplier/${encodeURIComponent(entity.key)}`;

export const Company: Story = {
  render: (_args, { globals }) => <PartyName party={cuiParty} entityHref={hrefOf} copy={sampleCopy.party(localeOf(globals["locale"]))} />,
};
export const NameOnlyCompany: Story = {
  render: (_args, { globals }) => <PartyName party={nameOnlyParty} entityHref={hrefOf} copy={sampleCopy.party(localeOf(globals["locale"]))} />,
};
export const NaturalPerson: Story = {
  render: (_args, { globals }) => <PartyName party={naturalPersonParty} entityHref={hrefOf} copy={sampleCopy.party(localeOf(globals["locale"]))} />,
};
/** Even if a payload carried a published name, a natural person is never named. */
export const NaturalPersonWithLeakedName: Story = {
  render: (_args, { globals }) => (
    <PartyName party={{ ...naturalPersonParty, publishedName: "Ionescu Vasile" }} entityHref={hrefOf} copy={sampleCopy.party(localeOf(globals["locale"]))} />
  ),
};
export const Consortium: Story = {
  render: (_args, { globals }) => (
    <Stack>
      {consortiumParties.map((party, index) => (
        <PartyName key={index} party={party} entityHref={hrefOf} copy={sampleCopy.party(localeOf(globals["locale"]))} />
      ))}
    </Stack>
  ),
};
