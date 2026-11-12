import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { catalogue } from "../../copy/index.ts";
import { SearchField } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/SearchField" };
export default meta;

function Controlled({ initial, locale }: { initial: string; locale: "en" | "ro" }) {
  const [value, setValue] = useState(initial);
  return <SearchField copy={catalogue[locale].searchField} value={value} onChange={setValue} />;
}
const localeOf = (global: unknown) => (global === "ro" ? "ro" : "en");

export const Empty: StoryObj = { render: (_a, { globals }) => <Controlled initial="" locale={localeOf(globals["locale"])} /> };
export const Typed: StoryObj = { render: (_a, { globals }) => <Controlled initial="Reabilitare pod" locale={localeOf(globals["locale"])} /> };
