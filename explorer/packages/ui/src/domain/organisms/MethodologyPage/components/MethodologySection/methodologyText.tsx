import type { ReactNode } from "react";
import type { Locale } from "../../../../../theme/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import type { Bani } from "../../../../types.ts";
import { withNodes } from "../../../../utils/withNodes.tsx";

/** A sentence that names amounts of money: the catalogue writes it with a placeholder per amount and gives the amounts as bani. */
export interface MethodologyAmountText {
  /** The sentence, with one of `amounts` (opaque placeholders) where each amount belongs. */
  build: (...amounts: string[]) => string;
  /** Integer bani, in the order the sentence uses them. The page renders each as a `MoneyAmount`; a test checks them against the counting rule. */
  bani: readonly Bani[];
}

/** One paragraph or list item of the prose: plain text, or text with amounts. */
export type MethodologyText = string | MethodologyAmountText;

/** Writes a sentence with amounts in the catalogue: `withAmounts((a, b) => \`...${a}...${b}\`, ["13506000", "45020000"])`. */
export const withAmounts = (build: MethodologyAmountText["build"], bani: readonly Bani[]): MethodologyAmountText => ({ build, bani });

/** The text as the page shows it: every amount in the money variant, the rest as written. */
export function renderMethodologyText(text: MethodologyText, locale: Locale): ReactNode {
  if (typeof text === "string") return text;
  return withNodes(text.build, text.bani.map((bani, i) => <MoneyAmount key={i} bani={bani} locale={locale} />));
}

/** The text as plain words (amounts as the money variant would read them), for keys and tests. */
export const plainMethodologyText = (text: MethodologyText): string => (typeof text === "string" ? text : text.build(...text.bani));
