// Seam 3: the header's progress bar shows while any data-client request is in flight, on the main screen and on an entity page, and goes when
// none is. One operation is held on a promise so the in-flight state can be read. EN and /ro/. Placement (header edge from md, viewport top below) needs a browser.
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App.tsx";
import { loadTestCountyTopology } from "./testing/countyTopology.ts";
import { fixtureClient } from "./testing/fixtureClient.ts";
import { openAt } from "./testing/openAt.ts";
import { loadTestUatTopology } from "./testing/uatTopology.ts";

afterEach(() => openAt("/"));

/** The header's bar (the only indeterminate linear progress: spinners and share bars are other progress bars). */
const bar = () => document.querySelector<HTMLElement>(".MuiLinearProgress-indeterminate");

describe.each([
  { lang: "en", main: "/explore/", entity: "/explore/authority/1000017" },
  { lang: "ro", main: "/ro/explore/", entity: "/ro/explore/authority/1000017" },
] as const)("the request progress bar ($lang)", ({ main, entity }) => {
  it.each([
    { page: "main screen", url: main, operation: "MainScreen" },
    { page: "entity page", url: entity, operation: "EntityOverview" },
  ])("is decorative and present on the $page only while a request is in flight", async ({ url, operation }) => {
    let release!: () => void;
    const until = new Promise<void>((resolve) => (release = resolve));
    openAt(url);
    const { client } = fixtureClient({ hold: { operation, until } });
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} loadUatTopology={loadTestUatTopology} />);

    await waitFor(() => expect(bar()).not.toBeNull());
    expect(bar()).toHaveAttribute("aria-hidden", "true");
    expect(bar()).not.toHaveAttribute("aria-label");
    expect(screen.queryByRole("progressbar", { name: /./ })).toBeNull();

    await act(async () => release());
    await waitFor(() => expect(bar()).toBeNull());
  });
});
