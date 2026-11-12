import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { testUatTopologies } from "../testing/uatTopology.ts";
import { UatTopologyProvider, uatTopologyUrl } from "./UatTopologyContext.tsx";
import { useUatTopology } from "./useUatTopology.ts";

afterEach(() => vi.unstubAllGlobals());

describe("the UAT outlines", () => {
  it("are served per county beside the county outlines", () => {
    expect(uatTopologyUrl("RO-BV")).toBe("/geo/uats/RO-BV.topo.json");
    expect(uatTopologyUrl("RO-B")).toBe("/geo/uats/RO-B.topo.json"); // Bucharest's file holds the object `sectors`
  });

  it("are fetched lazily by the default loader, and a missing file reads as an error", async () => {
    const fetch = vi.fn(async (url: string) => (url.endsWith("RO-BV.topo.json") ? Response.json(testUatTopologies["RO-BV"]) : new Response("", { status: 404 })));
    vi.stubGlobal("fetch", fetch);
    const wrapper = ({ children }: { children: ReactNode }) => <UatTopologyProvider>{children}</UatTopologyProvider>;
    const none = renderHook(() => useUatTopology(null), { wrapper });
    expect(fetch).not.toHaveBeenCalled(); // not zoomed: nothing is asked
    none.unmount();
    const bv = renderHook(() => useUatTopology("RO-BV"), { wrapper });
    await waitFor(() => expect(bv.result.current.status).toBe("ready"));
    const missing = renderHook(() => useUatTopology("RO-IS"), { wrapper });
    await waitFor(() => expect(missing.result.current.status).toBe("error"));
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(["/geo/uats/RO-BV.topo.json", "/geo/uats/RO-IS.topo.json"]);
  });
});
