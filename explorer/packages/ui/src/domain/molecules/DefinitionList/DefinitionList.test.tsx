import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { color } from "../../../theme/tokens.ts";
import { DefinitionList } from "./index.ts";

describe("DefinitionList", () => {
  it("renders a dl with its terms and definitions", () => {
    renderInUi(
      <DefinitionList>
        <dt>Kind</dt>
        <dd>Contract</dd>
      </DefinitionList>,
    );
    const term = screen.getByText("Kind");
    expect(term.closest("dl")).not.toBeNull();
    expect(screen.getByText("Contract").tagName).toBe("DD");
  });

  it("sets each term in muted mono", () => {
    renderInUi(
      <DefinitionList>
        <dt>Kind</dt>
        <dd>Contract</dd>
      </DefinitionList>,
    );
    const term = screen.getByText("Kind");
    expect(term).toHaveStyle({ color: color.muted });
    expect(getComputedStyle(term).fontSize).toBe("12px");
  });

  it("has a roomy gap by default and a tighter one when compact", () => {
    const gap = (compact: boolean) => {
      const { unmount } = renderInUi(
        <DefinitionList compact={compact}>
          <dt>Kind</dt>
          <dd>Contract</dd>
        </DefinitionList>,
      );
      const value = getComputedStyle(screen.getByText("Kind").closest("dl")!).columnGap;
      unmount();
      return value;
    };
    expect(gap(true)).toBe("16px");
    expect(gap(false)).toBe("24px");
  });

  it("sets the values at the small size when asked", () => {
    renderInUi(
      <DefinitionList valueSize="small">
        <dt>Kind</dt>
        <dd>Contract</dd>
      </DefinitionList>,
    );
    expect(getComputedStyle(screen.getByText("Contract")).fontSize).toBe("13px");
  });
});
