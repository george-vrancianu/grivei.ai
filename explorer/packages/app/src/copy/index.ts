import type { Locale } from "@grivei/ui";
import { en } from "./en.ts";
import { ro } from "./ro.ts";
import type { Copy } from "./types.ts";

export type { Copy } from "./types.ts";

/** The bilingual catalogue, the only source of user-facing strings. Read it with `useCopy()` in components. */
export const catalogue: Record<Locale, Copy> = { en, ro };
