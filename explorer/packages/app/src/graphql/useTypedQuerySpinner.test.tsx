import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTypedQuerySpinner } from "./useTypedQuerySpinner.ts";

type Props = Parameters<typeof useTypedQuerySpinner>;
const run = (...initial: Props) => renderHook((props: Props) => useTypedQuerySpinner(...props), { initialProps: initial });

describe("useTypedQuerySpinner", () => {
  it("spins while a newly typed query is unanswered, and stops when it settles", () => {
    const { result, rerender } = run("a", { status: "ready", stale: false });
    expect(result.current).toBe(false);
    rerender(["ab", { status: "ready", stale: true }]);
    expect(result.current).toBe(true);
    rerender(["ab", { status: "ready", stale: false }]);
    expect(result.current).toBe(false);
  });

  it("does not spin for a refetch of the same query (a page, order or filter change)", () => {
    const { result, rerender } = run("a", { status: "ready", stale: false });
    rerender(["a", { status: "ready", stale: true }]);
    expect(result.current).toBe(false);
  });

  it("an error ends the typed query's spinner", () => {
    const { result, rerender } = run("a", { status: "ready", stale: false });
    rerender(["ab", { status: "loading" }]);
    expect(result.current).toBe(true);
    rerender(["ab", { status: "error" }]);
    expect(result.current).toBe(false);
  });
});
