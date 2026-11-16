import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../../atoms/Button/index.ts";
import { pick } from "../../../workbench/index.ts";
import { FilterBarRow } from "./index.ts";

const meta = { title: "Domain/FilterBarRow" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const labels = { en: ["Signals", "Year", "Channel", "Value", "Procedure", "Badges", "Party"], ro: ["Semnale", "An", "Canal", "Valoare", "Procedură", "Insigne", "Partid"] };

/** Controls 8 px apart: wrapping from `md`, one sideways-scrolling row with a fade below it (switch the viewport to a phone). */
export const Controls: Story = {
  render: (_args, { globals }) => (
    <FilterBarRow>
      {pick(globals["locale"], labels).map((label) => (
        <Button key={label} variant="outlined">
          {label}
        </Button>
      ))}
    </FilterBarRow>
  ),
};
