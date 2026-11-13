import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { CopyLinkButton } from "./index.ts";
import { REANNOUNCE_MS } from "./hooks/useCopyLink.ts";

const copy = { label: "Copy link", copied: "Link copied", failed: "Could not copy the link" };
const URL_TO_COPY = "https://grivei.ai/explore/record/CAN1145000";

/** A clipboard whose `writeText` the test controls. */
function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CopyLinkButton", () => {
  it("is a button named by its label, with nothing said before it is used", () => {
    renderInUi(<CopyLinkButton url={URL_TO_COPY} copy={copy} />);
    expect(screen.getByRole("button", { name: "Copy link" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("copies the URL on a click and says so in a polite live region", async () => {
    const user = userEvent.setup();
    renderInUi(<CopyLinkButton url={URL_TO_COPY} copy={copy} />);
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Link copied");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
    expect(await navigator.clipboard.readText()).toBe(URL_TO_COPY);
  });

  it("works from the keyboard", async () => {
    const user = userEvent.setup();
    renderInUi(<CopyLinkButton url={URL_TO_COPY} copy={copy} />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Copy link" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByText("Link copied")).toBeVisible();
    await user.keyboard(" ");
    expect(await navigator.clipboard.readText()).toBe(URL_TO_COPY);
  });

  it("says it could not copy when the clipboard refuses", async () => {
    const user = userEvent.setup();
    mockClipboard(() => Promise.reject(new Error("denied")));
    renderInUi(<CopyLinkButton url={URL_TO_COPY} copy={copy} />);
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Could not copy the link");
  });

  it("says it could not copy when there is no clipboard at all", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    renderInUi(<CopyLinkButton url={URL_TO_COPY} copy={copy} />);
    await user.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Could not copy the link");
  });

  it("forgets the confirmation after a few seconds, and copies again on another click", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const writeText = vi.fn(() => Promise.resolve());
      mockClipboard(writeText); // after setup: user-event installs its own clipboard
      renderInUi(<CopyLinkButton url={URL_TO_COPY} copy={copy} />);
      await user.click(screen.getByRole("button", { name: "Copy link" }));
      expect(await screen.findByText("Link copied")).toBeVisible();
      vi.advanceTimersByTime(5000);
      await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(""));
      await user.click(screen.getByRole("button", { name: "Copy link" }));
      expect(writeText).toHaveBeenCalledTimes(2);
      expect(writeText).toHaveBeenCalledWith(URL_TO_COPY);
    } finally {
      vi.useRealTimers();
    }
  });

  it("announces a second copy again: the live region empties between the two", async () => {
    const user = userEvent.setup();
    renderInUi(<CopyLinkButton url={URL_TO_COPY} copy={copy} />);
    mockClipboard(() => Promise.resolve());
    const seen: string[] = [];
    const observer = new MutationObserver(() => seen.push(screen.getByRole("status").textContent ?? ""));
    observer.observe(screen.getByRole("status"), { childList: true, characterData: true, subtree: true });
    try {
      await user.click(screen.getByRole("button", { name: "Copy link" }));
      await waitFor(() => expect(seen).toContain("Link copied"));
      await user.click(screen.getByRole("button", { name: "Copy link" }));
      await waitFor(() => expect(seen.filter((text) => text === "Link copied")).toHaveLength(2));
      expect(seen).toEqual(["Link copied", "", "Link copied"]);
    } finally {
      observer.disconnect();
    }
  });

  it("sets no state and starts no timer when it unmounts during the re-announce wait", async () => {
    vi.useFakeTimers();
    try {
      mockClipboard(() => Promise.resolve());
      const { unmount } = renderInUi(<CopyLinkButton url={URL_TO_COPY} copy={copy} />);
      fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
      await vi.advanceTimersByTimeAsync(0);
      fireEvent.click(screen.getByRole("button", { name: "Copy link" })); // second copy: now waiting out the re-announce gap
      unmount();
      await vi.advanceTimersByTimeAsync(REANNOUNCE_MS + 10);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
