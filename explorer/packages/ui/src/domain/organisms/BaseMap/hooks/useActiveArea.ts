import { useState } from "react";

/** The area the reader is pointing at or has focused (one at a time); `null` when none. */
export function useActiveArea(): [string | null, (code: string | null) => void] {
  return useState<string | null>(null);
}
