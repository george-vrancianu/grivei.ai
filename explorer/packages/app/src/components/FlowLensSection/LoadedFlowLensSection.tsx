import { useCountyTopology } from "../../geo/index.ts";
import { FlowLensSection, type FlowLensSectionProps } from "./FlowLensSection.tsx";

/** The Flow lens with the county outlines loaded (once for the app) when it first renders: a page mounts this only while the lens is open. */
export function LoadedFlowLensSection(props: Omit<FlowLensSectionProps, "topology">) {
  return <FlowLensSection topology={useCountyTopology()} {...props} />;
}
