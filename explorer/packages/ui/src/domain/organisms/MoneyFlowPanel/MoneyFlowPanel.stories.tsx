import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "../../../atoms/Box/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { Skeleton } from "../../../atoms/Skeleton/index.ts";
import { Button } from "../../../atoms/Button/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { StateNote } from "../../molecules/StateNote/index.ts";
import { MoneyFlowPanel } from "./index.ts";

const meta = { title: "Domain/MoneyFlowPanel" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const loading = (locale: "en" | "ro") => (locale === "ro" ? "Se încarcă…" : "Loading…");

/** The shell with a body of plain text: an authority's meta line. */
export const Authority: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <MoneyFlowPanel role="authority" copy={sampleCopy.flowLensMap(locale).panel} foot={<span>{sampleCopy.flowLensMap(locale).caption.offMap}</span>}>
        <Typography>{sampleCopy.flowLensMap(locale).empty}</Typography>
      </MoneyFlowPanel>
    );
  },
};
/** A supplier's meta line. */
export const Supplier: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <MoneyFlowPanel role="supplier" copy={sampleCopy.flowLensMap(locale).panel}>
        <Typography>{sampleCopy.flowLensMap(locale).empty}</Typography>
      </MoneyFlowPanel>
    );
  },
};
/** A first load: the loading status in the header, a block where the map will be. */
export const Loading: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <MoneyFlowPanel role="authority" status={<LoadingStatus label={loading(locale)} />} copy={sampleCopy.flowLensMap(locale).panel}>
        <Skeleton aria-hidden="true" variant="rounded" width="100%" sx={{ height: "auto", aspectRatio: "640 / 420" }} />
      </MoneyFlowPanel>
    );
  },
};
/** A refetch: the last body stays, dimmed with aria-busy; the header strip stays at full strength. */
export const Busy: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <MoneyFlowPanel role="authority" busy status={<LoadingStatus label={loading(locale)} />} copy={sampleCopy.flowLensMap(locale).panel}>
        <Typography>{sampleCopy.flowLensMap(locale).empty}</Typography>
      </MoneyFlowPanel>
    );
  },
};
/** A failed request: the note with its retry inside the panel. */
export const Failed: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <MoneyFlowPanel role="supplier" copy={sampleCopy.flowLensMap(locale).panel}>
        <Box>
          <StateNote kind="error" action={<Button size="small">{locale === "ro" ? "Reîncearcă" : "Retry"}</Button>}>
            {locale === "ro" ? "Cererea a eșuat." : "The request failed."}
          </StateNote>
        </Box>
      </MoneyFlowPanel>
    );
  },
};
