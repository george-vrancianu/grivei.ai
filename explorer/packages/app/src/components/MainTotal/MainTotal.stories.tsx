import type { Meta, StoryObj } from "@storybook/react-vite";
import { fixtures } from "@grivei/contract/fixtures";
import { catalogue } from "../../copy/index.ts";
import { MainTotal } from "./index.ts";

const meta = { title: "App/MainTotal", component: MainTotal } satisfies Meta<typeof MainTotal>;
export default meta;
type Story = StoryObj<typeof meta>;

const national = fixtures.MainScreen.find((f) => f.name === "empty-filter-national")!.data;

export const National: Story = {
  // copy and locale follow the toolbar's language in `render`; the args only satisfy the types
  args: { total: national.seap.search.total, copy: { heading: catalogue.en.main.total, total: catalogue.en.total, partyCoverage: catalogue.en.partyCoverage }, locale: "en", methodologyHref: "/explore/methodology#awarded-value", partyHref: "/explore/methodology#party-and-leadership", suspectHref: "/explore/?badges=suspect-value&tab=records" },
  render: (args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    const t = catalogue[locale];
    return <MainTotal {...args} locale={locale} copy={{ heading: t.main.total, total: t.total, partyCoverage: t.partyCoverage }} />;
  },
};

const party = fixtures.MainScreen.find((f) => f.name === "party-psd")!.data;

/** A Party-filtered search: the Total, then what the filter covers (direct against subordinate, the share left unattributed). */
export const PartyFiltered: Story = {
  ...National,
  args: { ...National.args, total: party.seap.search.total },
};
