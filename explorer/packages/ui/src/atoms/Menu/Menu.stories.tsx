import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { pick } from "../../workbench/index.ts";
import { Button } from "../Button/index.ts";
import { MenuItem } from "../MenuItem/index.ts";
import { Menu } from "./index.ts";

const meta = { title: "Atoms/Menu", component: Menu, args: { open: false, children: null } } satisfies Meta<typeof Menu>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A button with its menu open, so the story shows the floating surface. */
function Anchored({ label, items }: { label: string; items: string[] }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Button variant="outlined" ref={setAnchor} aria-haspopup="menu" aria-expanded={anchor !== null}>{label}</Button>
      <Menu open={anchor !== null} anchorEl={anchor} onClose={() => {}} aria-label={label}>
        {items.map((item) => <MenuItem key={item}>{item}</MenuItem>)}
      </Menu>
    </>
  );
}

export const Open: Story = {
  render: (_args, { globals }) => (
    <Anchored
      label={pick(globals["locale"], { en: "Channel", ro: "Canal" })}
      items={pick(globals["locale"], { en: ["Direct purchase", "Contract"], ro: ["Achiziție directă", "Contract"] })}
    />
  ),
};
