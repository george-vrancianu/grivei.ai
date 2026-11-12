import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { useState } from "react";
import { Tab } from "../Tab/index.ts";
import { Tabs } from "./index.ts";

const meta = { title: "Atoms/Tabs", component: Tabs } satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (_args, { globals }) => {
    const Demo = () => {
      const [value, setValue] = useState("contracts");
      return (
        <Tabs value={value} onChange={(_e, next: string) => setValue(next)} aria-label={pick(globals["locale"], { en: "Results", ro: "Rezultate" })}>
          <Tab value="authorities" label={pick(globals["locale"], { en: "Authorities", ro: "Autorități" })} />
          <Tab value="suppliers" label={pick(globals["locale"], { en: "Suppliers", ro: "Furnizori" })} />
          <Tab value="contracts" label={pick(globals["locale"], { en: "Contracts", ro: "Contracte" })} />
        </Tabs>
      );
    };
    return <Demo />;
  },
};

export const WithDisabledTab: Story = {
  render: (_args, { globals }) => (
    <Tabs value="a" aria-label={pick(globals["locale"], { en: "Results", ro: "Rezultate" })}>
      <Tab value="a" label={pick(globals["locale"], { en: "Contracts", ro: "Contracte" })} />
      <Tab value="b" disabled label={pick(globals["locale"], { en: "Soon", ro: "În curând" })} />
    </Tabs>
  ),
};

export const ManyTabsScroll: Story = {
  render: (_args, { globals }) => (
    <Tabs value={0} sx={{ maxWidth: 320 }} aria-label={pick(globals["locale"], { en: "Results", ro: "Rezultate" })}>
      {Array.from({ length: 8 }, (_, i) => (
        <Tab key={i} value={i} label={pick(globals["locale"], { en: "Procedure " + (i + 1), ro: "Procedura de atribuire " + (i + 1) })} />
      ))}
    </Tabs>
  ),
};
