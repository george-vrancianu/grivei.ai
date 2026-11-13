import type { Meta, StoryObj } from "@storybook/react-vite";
import { Typography } from "../../../atoms/Typography/index.ts";
import { localeOf } from "../../samples/copy.ts";
import { Panel } from "./index.ts";

const meta = { title: "Domain/Panel", component: Panel } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** A card with a mono accent title and any content. */
export const Typical: Story = {
  render: (_args, { globals }) => {
    const ro = localeOf(globals["locale"]) === "ro";
    return (
      <Panel heading={ro ? "Proveniență" : "Provenance"}>
        <Typography>{ro ? "Anunț de atribuire CAN1145000 pe e-licitatie.ro." : "Award notice CAN1145000 on e-licitatie.ro."}</Typography>
      </Panel>
    );
  },
};
