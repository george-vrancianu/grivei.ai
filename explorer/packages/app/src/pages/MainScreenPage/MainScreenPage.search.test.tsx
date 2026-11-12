// Seam 3 for the search bar: typing is debounced into the URL (history replaced), and a superseded request is cancelled.
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { createClient, type GraphqlClient } from "../../graphql/client.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

const box = () => screen.getByRole("searchbox", { name: catalogue.en.searchBar.label });

describe.each([
  { page: "the main screen", url: "/explore/" },
  { page: "the full-results view", url: "/explore/search" },
])("typing on $page", ({ url }) => {
  it("puts the query in the URL once after the debounce, replacing the history entry", async () => {
    openAt(url);
    render(<App client={fixtureClient().client} />);
    const before = window.history.length;
    const replace = vi.spyOn(window.history, "replaceState");
    const push = vi.spyOn(window.history, "pushState");

    await userEvent.type(box(), "contract");
    expect(window.location.search).toBe(""); // still waiting for typing to pause
    await waitFor(() => expect(window.location.search).toBe("?q=contract"));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
    expect(window.history.length).toBe(before);
  });

  it("drops q at once-after-the-debounce when the box is cleared, then does not search for one character", async () => {
    openAt(`${url}?q=contract`);
    render(<App client={fixtureClient().client} />);
    await userEvent.clear(box());
    await waitFor(() => expect(window.location.search).toBe(""));
    const replace = vi.spyOn(window.history, "replaceState");
    await userEvent.type(box(), "c");
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(window.location.search).toBe("");
    expect(replace).not.toHaveBeenCalled();
  });

  it("follows the URL when it changes from outside (Back)", async () => {
    openAt(`${url}?q=contract`);
    render(<App client={fixtureClient().client} />);
    expect(box()).toHaveValue("contract");
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
    await waitFor(() => expect(box()).toHaveValue(""));
  });
});

describe("the placeholder", () => {
  it("tells English readers that the data is in Romanian", () => {
    openAt("/explore/");
    render(<App client={fixtureClient().client} />);
    expect(box()).toHaveAttribute("placeholder", expect.stringContaining("Romanian"));
    expect(box()).toHaveAttribute("placeholder", expect.stringContaining("deszăpezire"));
  });

  it("is in Romanian at /ro/explore/", () => {
    openAt("/ro/explore/");
    render(<App client={fixtureClient().client} />);
    const romanianBox = screen.getByRole("searchbox", { name: catalogue.ro.searchBar.label });
    expect(romanianBox).toHaveAttribute("placeholder", catalogue.ro.searchBar.placeholder);
    expect(catalogue.ro.searchBar.placeholder).toContain("deszăpezire");
  });
});

/** A client that ignores the abort signal and holds every answer until the test releases it. */
function heldClient() {
  const real = fixtureClient().client;
  const held: (() => void)[] = [];
  const client: GraphqlClient = {
    query: (op, variables) => {
      const answer = real.query(op, variables);
      return new Promise((resolve, reject) => void held.push(() => void answer.then(resolve, reject)));
    },
  };
  return { client, held };
}

describe("a stale response", () => {
  it.each([
    ["/explore/", "contract"],
    ["/explore/search", "zzzzzz"],
  ])("never overwrites a newer one (%s)", async (url, typed) => {
    openAt(url);
    const { client, held } = heldClient();
    render(<App client={client} />);
    await waitFor(() => expect(held).toHaveLength(1));
    await userEvent.type(box(), typed);
    await waitFor(() => expect(held).toHaveLength(2));
    expect(screen.getByRole("search")).toHaveAttribute("aria-busy", "true");

    await act(async () => {
      held[1]?.(); // the newer answer arrives first
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    await waitFor(() => expect(screen.getByRole("search")).not.toHaveAttribute("aria-busy", "true"));
    await act(async () => {
      held[0]?.(); // then the older one, which ignored the abort
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(screen.getByRole("search")).not.toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("a superseded request", () => {
  it.each([
    ["/explore/", "MainScreen"],
    ["/explore/search", "FullResults"],
  ])("is aborted when the query changes (%s)", async (url) => {
    openAt(url);
    const signals: AbortSignal[] = [];
    const client = createClient({
      // Never answers: each request lives until it is aborted.
      fetch: (_input, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal as AbortSignal;
          signals.push(signal);
          signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    });
    render(<App client={client} />);
    await waitFor(() => expect(signals).toHaveLength(1));
    expect(signals[0]?.aborted).toBe(false);

    await userEvent.type(box(), "contract");
    await waitFor(() => expect(signals).toHaveLength(2));
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    expect(screen.getByRole("search")).toHaveAttribute("aria-busy", "true");
  });

  it("is aborted when the page unmounts", async () => {
    openAt("/explore/");
    const signals: AbortSignal[] = [];
    const client = createClient({ fetch: (_i, init) => new Promise(() => void signals.push(init?.signal as AbortSignal)) });
    const { unmount } = render(<App client={client} />);
    await waitFor(() => expect(signals).toHaveLength(1));
    unmount();
    expect(signals[0]?.aborted).toBe(true);
  });
});
