import { Fragment, type ReactNode } from "react";

const FIRST_TOKEN = 0xe000;

/**
 * Puts nodes into a sentence that the copy catalogue builds as a string. The copy function is called with one placeholder per node
 * (a private-use character no copy contains), and the result is split at the placeholders, so the node (a `<MoneyAmount>`) takes
 * its place and the rest stays text. The sentence is word for word what the catalogue says, in both languages.
 */
export function withNodes(build: (...tokens: string[]) => string, nodes: readonly ReactNode[]): ReactNode {
  const tokens = nodes.map((_, i) => String.fromCharCode(FIRST_TOKEN + i));
  const parts = build(...tokens).split(new RegExp(`([${tokens.join("")}])`));
  return parts.map((part, i) => {
    const index = tokens.indexOf(part);
    return <Fragment key={i}>{index === -1 ? part : nodes[index]}</Fragment>;
  });
}
