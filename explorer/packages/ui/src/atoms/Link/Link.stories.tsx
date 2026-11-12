import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Link } from "./index.ts";

const meta = { title: "Atoms/Link", component: Link, args: { href: "https://example.org" } } satisfies Meta<typeof Link>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args, { globals }) => <Link {...args}>{pick(globals["locale"], { en: "Primăria Cluj-Napoca", ro: "Primăria Cluj-Napoca" })}</Link>,
};

export const External: Story = {
  args: { target: "_blank" },
  render: (args, { globals }) => <Link {...args}>{pick(globals["locale"], { en: "Open the source notice", ro: "Deschide anunțul sursă" })}</Link>,
};

export const Underlines: Story = {
  render: (args, { globals }) => (
    <>
      {(["none", "hover", "always"] as const).map((underline) => (
        <Link key={underline} {...args} underline={underline} sx={{ mr: 2 }}>{underline}: {pick(globals["locale"], { en: "link", ro: "legătură" })}</Link>
      ))}
    </>
  ),
};

export const LongText: Story = {
  render: (args, { globals }) => (
    <Link {...args} sx={{ display: "inline-block", maxWidth: 260 }}>{pick(globals["locale"], { en: "National Roads and Construction Company “Romanian Country Highway” S.R.L. joint venture for the rehabilitation of county road infrastructure and associated works", ro: "Societatea Comercială de Construcții și Drumuri Naționale „Șoseaua Țării Românești” S.R.L. — Asociere pentru lucrări de reabilitare a infrastructurii rutiere județene" })}</Link>
  ),
};
