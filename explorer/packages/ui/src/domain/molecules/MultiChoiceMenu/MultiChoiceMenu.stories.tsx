import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { pick } from "../../../workbench/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { MultiChoiceMenu } from "./index.ts";

const meta = { title: "Domain/MultiChoiceMenu" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

// Source data: Romanian in both languages.
const OPTIONS = [{ value: "open", label: "Licitație deschisă" }, { value: "direct", label: "Achiziție directă" }, { value: "negotiated", label: "Negociere fără publicare prealabilă" }];

function Demo({ locale, initial, open }: { locale: unknown; initial: string[]; open?: boolean }) {
  const [chosen, setChosen] = useState(initial);
  return (
    <MultiChoiceMenu
      label={pick(locale, { en: "Procedure", ro: "Procedură" })}
      unsetLabel={sampleCopy.filterChips(localeOf(locale)).menuAny}
      options={OPTIONS}
      selected={chosen}
      onToggle={(value) => setChosen((now) => (now.includes(value) ? now.filter((v) => v !== value) : [...now, value]))}
      picked={(n) => pick(locale, { en: `${n} picked`, ro: `${n} alese` })}
      defaultOpen={open}
    />
  );
}

/** Nothing ticked: the button reads Any. */
export const Any: Story = { render: (_args, { globals }) => <Demo locale={globals["locale"]} initial={[]} /> };
/** Two ticked, menu open: the button counts them. */
export const OpenTwoPicked: Story = { render: (_args, { globals }) => <Demo locale={globals["locale"]} initial={["open", "direct"]} open /> };
