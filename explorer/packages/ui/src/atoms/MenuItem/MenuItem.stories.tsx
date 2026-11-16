import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState, type ReactNode } from "react";
import { pick } from "../../workbench/index.ts";
import { Button } from "../Button/index.ts";
import { Menu } from "../Menu/index.ts";
import { MenuItem, type MenuItemProps } from "./index.ts";

const meta = { title: "Atoms/MenuItem", component: MenuItem } satisfies Meta<typeof MenuItem>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A MenuItem needs a menu's list around it, so each story opens one. */
function InMenu({ children }: { children: ReactNode }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <Button variant="outlined" ref={setAnchor}>Menu</Button>
      <Menu open={anchor !== null} anchorEl={anchor} onClose={() => {}}>{children}</Menu>
    </>
  );
}
const item = (args: MenuItemProps, label: ReactNode) => <InMenu><MenuItem {...args}>{label}</MenuItem></InMenu>;

export const Default: Story = {
  render: (args, { globals }) => item(args, pick(globals["locale"], { en: "Direct purchase", ro: "Achiziție directă" })),
};

export const Chosen: Story = {
  args: { role: "menuitemradio", "aria-checked": true },
  render: (args, { globals }) => item(args, pick(globals["locale"], { en: "Contract", ro: "Contract" })),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args, { globals }) => item(args, pick(globals["locale"], { en: "No procedures to choose from.", ro: "Nu există proceduri de ales." })),
};
