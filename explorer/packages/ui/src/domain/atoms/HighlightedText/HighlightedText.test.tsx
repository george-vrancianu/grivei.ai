import { render } from "@testing-library/react";
import { HighlightedText } from "./index.ts";

function marks(container: HTMLElement) {
  return [...container.querySelectorAll("mark")].map((m) => m.textContent);
}

describe("HighlightedText", () => {
  it("renders the text unmarked when there are no ranges", () => {
    const { container } = render(<HighlightedText text="Deszăpezire străzi" highlights={[]} />);
    expect(marks(container)).toEqual([]);
    expect(container).toHaveTextContent("Deszăpezire străzi");
  });

  it("marks exactly text.slice(start, end) for one range and leaves the rest unmarked", () => {
    const text = "Deszăpezire străzi, sezon rece";
    const { container } = render(<HighlightedText text={text} highlights={[[0, 10]]} />);
    expect(marks(container)).toEqual([text.slice(0, 10)]);
    expect(container.textContent).toBe(text);
    expect(container.querySelector("span")!.childNodes[1]!.textContent).toBe(text.slice(10));
  });

  it("marks several ranges, in order, with the gaps unmarked", () => {
    const text = "Servicii de întreținere spații verzi (2)";
    const ranges = [[24, 30], [31, 36]];
    const { container } = render(<HighlightedText text={text} highlights={ranges} />);
    expect(marks(container)).toEqual(ranges.map(([s, e]) => text.slice(s, e)));
    expect(container.textContent).toBe(text);
    // the only text outside a mark is what lies between and around the ranges
    const unmarked = [...container.firstElementChild!.childNodes].filter((n) => n.nodeName !== "MARK").map((n) => n.textContent);
    expect(unmarked).toEqual([text.slice(0, 24), text.slice(30, 31), text.slice(36)]);
  });

  it("keeps adjacent ranges as separate marks", () => {
    const { container } = render(<HighlightedText text="abcdef" highlights={[[0, 2], [2, 4]]} />);
    expect(marks(container)).toEqual(["ab", "cd"]);
  });

  it("merges overlapping ranges into one mark and accepts them unsorted", () => {
    const { container } = render(<HighlightedText text="abcdefgh" highlights={[[4, 7], [1, 3], [2, 5]]} />);
    expect(marks(container)).toEqual(["bcdefg"]);
    expect(container.textContent).toBe("abcdefgh");
  });

  it("handles ranges at the very start and the very end", () => {
    const { container } = render(<HighlightedText text="abcdef" highlights={[[0, 1], [5, 6]]} />);
    expect(marks(container)).toEqual(["a", "f"]);
    expect(container.textContent).toBe("abcdef");
  });

  it("clamps an out-of-bounds range and ignores empty, inverted and fully outside ranges", () => {
    const { container } = render(
      <HighlightedText text="abcdef" highlights={[[-3, 2], [4, 99], [3, 3], [5, 2], [10, 12]]} />,
    );
    expect(marks(container)).toEqual(["ab", "ef"]);
    expect(container.textContent).toBe("abcdef");
  });

  it("counts UTF-16 code units: Romanian diacritics and an astral character before the range", () => {
    // "𝟙" (U+1D7D9) is two code units, so the indices below are JS string indices, not code points
    const text = "Șantier 𝟙 școală înființare";
    const start = text.indexOf("școală");
    const end = start + "școală".length;
    expect(start).toBe(11);
    const { container } = render(<HighlightedText text={text} highlights={[[0, 7], [start, end]]} />);
    expect(marks(container)).toEqual(["Șantier", "școală"]);
    expect(container.textContent).toBe(text);
  });
});
