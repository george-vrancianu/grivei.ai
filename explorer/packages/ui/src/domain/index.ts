// Domain displays: presentational pieces typed from the contract (atoms), the few that compose them (molecules),
// and self-contained regions of a screen (organisms).
export * from "./atoms/index.ts";
export * from "./molecules/index.ts";
export * from "./organisms/index.ts";
export * from "./templates/index.ts";
export type { EntityHeaderData, EntityPageRole, EntityPageView, RecordsTabData } from "./types.ts";
export { followLink } from "./utils/followLink.ts";
