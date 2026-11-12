import { describe, expect, it } from "vitest";
import { localeFromPath } from "./locale.ts";

describe("localeFromPath", () => {
  it.each([
    ["/explore/", "en"],
    ["/explore", "en"],
    ["/explore/coverage", "en"],
    ["/ro/explore/", "ro"],
    ["/ro/explore", "ro"],
    ["/ro/explore/coverage", "ro"],
    ["/ro/", "en"], // the landing page is not the app
    ["/ro/exploreX", "en"],
  ])("%s is %s", (path, locale) => {
    expect(localeFromPath(path)).toBe(locale);
  });
});
