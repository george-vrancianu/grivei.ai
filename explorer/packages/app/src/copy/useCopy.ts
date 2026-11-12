import { useLocation } from "../routing/location.tsx";
import { catalogue, type Copy } from "./index.ts";

/** The catalogue in the current language. */
export function useCopy(): Copy {
  return catalogue[useLocation().locale];
}
