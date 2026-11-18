import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { DefinitionList } from "./index.ts";

const meta = { title: "Domain/DefinitionList", component: DefinitionList } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const rows = (locale: unknown) => (
  <>
    <dt>{pick(locale, { en: "Kind", ro: "Tip" })}</dt>
    <dd>{pick(locale, { en: "Direct award", ro: "Atribuire directă" })}</dd>
    <dt>{pick(locale, { en: "Procedure", ro: "Procedură" })}</dt>
    <dd>{pick(locale, { en: "Open tender for works, as published", ro: "Licitație deschisă pentru lucrări, așa cum a fost publicată" })}</dd>
  </>
);

/** A panel's facts: a roomy gap, the label above its value on a narrow screen. */
export const Facts: Story = { render: (_a, { globals }) => <DefinitionList>{rows(globals["locale"])}</DefinitionList> };

/** A card's parties: tight, the label always beside its value. */
export const Compact: Story = { render: (_a, { globals }) => <DefinitionList compact valueSize="small">{rows(globals["locale"])}</DefinitionList> };
