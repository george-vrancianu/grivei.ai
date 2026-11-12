import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useProcedureOptions } from "./useProcedureOptions.ts";

const ALL = ["Achiziție directă", "Licitație deschisă", "Negociere fără publicare prealabilă"];

describe("useProcedureOptions", () => {
  it("offers the latest list, and keeps it while the next answer loads", () => {
    const { result, rerender } = renderHook(({ latest }) => useProcedureOptions(latest, undefined), { initialProps: { latest: ALL as string[] | null } });
    expect(result.current).toEqual(ALL);
    rerender({ latest: null });
    expect(result.current).toEqual(ALL);
  });

  it("keeps the other procedures offered when a facet narrows to the chosen one (multi-select stays reachable)", () => {
    const { result, rerender } = renderHook(({ latest, selected }) => useProcedureOptions(latest, selected), {
      initialProps: { latest: ALL as string[] | null, selected: undefined as string[] | undefined },
    });
    rerender({ latest: ["Licitație deschisă"], selected: ["Licitație deschisă"] });
    expect(result.current).toEqual(ALL);
  });

  it("adds names a narrowed answer brings that were not offered yet", () => {
    const { result, rerender } = renderHook(({ latest, selected }) => useProcedureOptions(latest, selected), {
      initialProps: { latest: ["Licitație deschisă"] as string[] | null, selected: ["Licitație deschisă"] as string[] | undefined },
    });
    rerender({ latest: ["Licitație deschisă", "Achiziție directă"], selected: ["Licitație deschisă"] });
    expect(result.current).toEqual(["Licitație deschisă", "Achiziție directă"]);
  });

  it("replaces the list again once no procedure is chosen", () => {
    const { result, rerender } = renderHook(({ latest, selected }) => useProcedureOptions(latest, selected), {
      initialProps: { latest: ALL as string[] | null, selected: ["Licitație deschisă"] as string[] | undefined },
    });
    rerender({ latest: ["Achiziție directă"], selected: undefined });
    expect(result.current).toEqual(["Achiziție directă"]);
  });
});
