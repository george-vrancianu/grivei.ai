import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { withNodes } from "./withNodes.tsx";

describe("withNodes", () => {
  it("puts each node where the sentence has its placeholder", () => {
    render(<p>{withNodes((a, b) => `ceilings ${a}, reported ${b}`, [<b key="a">RON 5</b>, <i key="b">RON 7</i>])}</p>);
    expect(screen.getByText("RON 5").tagName).toBe("B");
    expect(screen.getByText("RON 7").tagName).toBe("I");
    expect(screen.getByRole("paragraph")).toHaveTextContent("ceilings RON 5, reported RON 7");
  });

  it("keeps a sentence without placeholders, and uses a placeholder twice", () => {
    render(<p>{withNodes(() => "nothing to show", [<b key="a">x</b>])}</p>);
    expect(screen.getByRole("paragraph")).toHaveTextContent("nothing to show");
    render(<span data-testid="twice">{withNodes((a) => `${a} and ${a}`, ["1"])}</span>);
    expect(screen.getByTestId("twice")).toHaveTextContent("1 and 1");
  });
});
