import { afterEach, describe, expect, it } from "vitest";
import { currentUrl } from "./currentUrl.ts";

const open = (url: string) => window.history.replaceState(null, "", url);

describe("currentUrl", () => {
  afterEach(() => open("/"));

  it("is the address as the browser has it, query included and fragment left out", () => {
    open("/explore/search?tab=records&order=value#top");
    expect(currentUrl()).toBe(`${window.location.origin}/explore/search?tab=records&order=value`);
  });

  it("leaves the carried search out: it is where the reader came from, not part of the address", () => {
    open("/explore/supplier/2000007/records?channel=contract&search=q%3Dcomuna");
    expect(currentUrl()).toBe(`${window.location.origin}/explore/supplier/2000007/records?channel=contract`);
    open("/explore/supplier/2000007?search=q%3Dcomuna");
    expect(currentUrl()).toBe(`${window.location.origin}/explore/supplier/2000007`);
  });
});
