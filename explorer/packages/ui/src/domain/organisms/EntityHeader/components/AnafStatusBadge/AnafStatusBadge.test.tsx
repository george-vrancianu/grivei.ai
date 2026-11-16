import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { AnafStatusBadge } from "./index.ts";

const show = (status: string | null) => renderInUi(<AnafStatusBadge status={status} copy={sampleCopy.entityHeader("en").anafStatus} />);

describe("AnafStatusBadge", () => {
  it("shows an active status as plain text under its label, with no chip", () => {
    const { container } = show("ACTIV");
    const label = screen.getByText("ANAF status");
    const value = screen.getByText("ACTIV");
    expect(label.compareDocumentPosition(value) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector(".MuiChip-root")).toBeNull();
  });

  it("shows a status that is not active as a chip that says so in its tooltip", async () => {
    const { container } = show("RADIERE");
    expect(screen.getByText("ANAF status")).toBeVisible();
    const chip = container.querySelector<HTMLElement>(".MuiChip-root")!;
    expect(chip).toHaveTextContent("RADIERE");
    await userEvent.setup().hover(chip);
    expect(await screen.findByText("ANAF lists this entity as RADIERE, not active.")).toBeVisible();
  });

  it.each([null, "  "])("shows nothing for %j", (status) => {
    const { container } = show(status);
    expect(screen.queryByText("ANAF status")).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });
});
