import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { navigate } from "./location.tsx";

describe("navigate and the scroll position", () => {
  const scrollTo = vi.fn();
  beforeEach(() => {
    window.history.replaceState(null, "", "/explore/");
    scrollTo.mockClear();
    vi.stubGlobal("scrollTo", scrollTo);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("opens a followed link to another page at the top", () => {
    navigate("/explore/authority/123");
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("opens the turned page of a list at the top, though it is a replace", () => {
    navigate("/explore/search?q=a", "replace");
    scrollTo.mockClear();
    navigate("/explore/search?q=a&page=2", "replace");
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("leaves the scroll alone while typing or filtering on the same page", () => {
    navigate("/explore/?q=ab", "replace");
    navigate("/explore/?q=abc&county=RO-BV", "replace");
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("leaves a #fragment to the page that scrolls to it", () => {
    navigate("/explore/methodology#awarded-value");
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
