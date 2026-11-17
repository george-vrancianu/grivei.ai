import { describe, expect, it } from "vitest";
import { anyInFlight, busyPanels } from "./mainScreenPage.utils.ts";

describe("the held-query derivations", () => {
  const loading = { status: "loading" } as const;
  const fresh = { status: "ready", data: 1, stale: false } as const;
  const held = { status: "ready", data: 1, stale: true } as const;
  const failed = { status: "error", retry: () => {} } as const;

  it("counts a loading or held query as in flight, but only for the zoom and coverage queries that are asked", () => {
    expect(anyInFlight(fresh, { asked: false, state: loading }, { asked: false, state: held })).toBe(false);
    expect(anyInFlight(fresh, { asked: true, state: held }, { asked: false, state: fresh })).toBe(true);
    expect(anyInFlight(fresh, { asked: false, state: fresh }, { asked: true, state: loading })).toBe(true);
    expect(anyInFlight(held, { asked: false, state: fresh }, { asked: false, state: fresh })).toBe(true);
    expect(anyInFlight(failed, { asked: false, state: fresh }, { asked: false, state: fresh })).toBe(false);
  });

  it("dims the summary with the main query and the map with the query behind the lens on show", () => {
    expect(busyPanels(held, { coverage: false, zoomed: false }, fresh, fresh)).toEqual({ summary: true, map: true });
    expect(busyPanels(held, { coverage: false, zoomed: true }, fresh, fresh)).toEqual({ summary: true, map: false });
    expect(busyPanels(fresh, { coverage: true, zoomed: true }, fresh, held)).toEqual({ summary: false, map: true });
    expect(busyPanels(fresh, { coverage: false, zoomed: true }, held, fresh)).toEqual({ summary: false, map: true });
  });
});
