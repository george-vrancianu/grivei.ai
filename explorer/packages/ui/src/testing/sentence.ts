/**
 * A Testing Library text matcher for a sentence that is split across elements (an amount in its own `<MoneyAmount>` span):
 * it matches the innermost element whose whole text, whitespace collapsed, matches.
 */
export function sentence(pattern: string | RegExp): (content: string, element: Element | null) => boolean {
  const matches = (element: Element) => {
    const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
    return typeof pattern === "string" ? text === pattern : pattern.test(text);
  };
  return (_content, element) => element !== null && matches(element) && !Array.from(element.children).some(matches);
}
