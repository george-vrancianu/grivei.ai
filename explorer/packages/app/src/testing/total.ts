import { screen } from "@testing-library/react";

/** Money is written with a no-break space after the currency code: read it as the plain space a reader sees. */
export const plain = (text: string | null | undefined) => (text ?? "").replaceAll(" ", " ");

/** The main screen's Total as a reader sees it: the awarded value and the Records count. Throws until the Total is on screen, so `waitFor` retries. */
export function readTotal(): { awarded: string; records: string } {
  const [awarded, records] = Array.from(screen.getByTestId("main-total").querySelectorAll("p"));
  if (!awarded || !records) throw new Error("the Total is not complete");
  return { awarded: plain(awarded.textContent), records: plain(records.textContent) };
}
