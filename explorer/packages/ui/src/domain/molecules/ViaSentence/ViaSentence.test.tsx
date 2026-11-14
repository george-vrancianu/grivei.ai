import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { leadershipCopy, leadershipVia } from "../../samples/leadership.ts";
import { ViaSentence } from "./index.ts";

describe("ViaSentence", () => {
  it("puts the authority's name as a link inside the sentence and states the MF snapshot day", async () => {
    const onNavigate = vi.fn();
    renderInUi(<p data-testid="p"><ViaSentence via={leadershipVia.via!} sentence={leadershipCopy.en.via} href="/explore/authority/51000501" onNavigate={onNavigate} locale="en" /></p>);
    expect(screen.getByTestId("p")).toHaveTextContent("Shown through MUNICIPIUL BRASOV, principal credit holder, MF list snapshot 1 December 2026; funding relation, current tie.");
    await userEvent.click(screen.getByRole("link", { name: "MUNICIPIUL BRASOV" }));
    expect(onNavigate).toHaveBeenCalledWith("/explore/authority/51000501");
  });

  it("shows the authority's name as plain text, with no link, when no address is given", () => {
    renderInUi(<p data-testid="p"><ViaSentence via={leadershipVia.via!} sentence={leadershipCopy.en.via} locale="en" /></p>);
    expect(screen.getByTestId("p")).toHaveTextContent("Shown through MUNICIPIUL BRASOV, principal credit holder, MF list snapshot 1 December 2026; funding relation, current tie.");
    expect(screen.queryByRole("link")).toBeNull();
  });
});
