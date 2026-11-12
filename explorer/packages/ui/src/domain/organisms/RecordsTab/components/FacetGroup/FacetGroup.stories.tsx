import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf } from "../../../../samples/copy.ts";
import { FacetGroup, type FacetOptionData } from "./index.ts";

const meta = { title: "Domain/RecordsTab/FacetGroup", component: FacetGroup } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const option = (id: string, label: string, extra: Partial<FacetOptionData> = {}): FacetOptionData => ({ id, label, pressed: false, onToggle: () => {}, ...extra });
const sample =
  (options: FacetOptionData[]): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <FacetGroup title={locale === "ro" ? "Canal" : "Channel"} options={options} optionText={(label, count) => `${label} (${count})`} locale={locale} />;
  };

export const WithCounts: Story = { render: sample([option("a", "Achiziție directă", { count: { records: 41, estimated: false } }), option("b", "Licitație deschisă", { count: { records: 8, estimated: false } })]) };
export const OneOn: Story = { render: sample([option("a", "Achiziție directă", { count: { records: 41, estimated: false }, pressed: true }), option("b", "Licitație deschisă", { count: { records: 8, estimated: false } })]) };
export const EstimatedCount: Story = { render: sample([option("a", "Achiziție directă", { count: { records: 1_240_000, estimated: true } })]) };
export const ActiveWithoutCount: Story = { render: sample([option("a", "Licitație deschisă", { pressed: true })]) };
