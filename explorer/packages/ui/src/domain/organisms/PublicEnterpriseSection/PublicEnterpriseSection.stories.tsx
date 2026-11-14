import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf } from "../../samples/copy.ts";
import { publicEnterprise, publicEnterpriseBare, publicEnterpriseCopy } from "../../samples/publicEnterprise.ts";
import type { PublicEnterpriseData } from "../../types.ts";
import { PublicEnterpriseSection } from "./index.ts";

const meta = { title: "Domain/PublicEnterpriseSection", component: PublicEnterpriseSection } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const section = (enterprise: PublicEnterpriseData): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <PublicEnterpriseSection enterprise={enterprise} cui="2000007" locale={locale} copy={publicEnterpriseCopy[locale]} />;
  },
});

export const Listed = section(publicEnterprise);
export const OnlyTheNameAndOneYear = section(publicEnterpriseBare);
