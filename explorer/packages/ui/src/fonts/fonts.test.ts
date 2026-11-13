import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(dir, "fonts.css"), "utf8");

describe("the bundled fonts", () => {
  it("are served from the explorer: every url is a file beside the stylesheet, none a CDN", () => {
    const urls = [...css.matchAll(/url\(["']?([^)"']+)["']?\)/g)].map((match) => match[1]!);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url, "no network font").not.toMatch(/^(https?:)?\/\//);
      expect(existsSync(join(dir, url)), url).toBe(true);
    }
  });

  it("cover the three families of the type scale", () => {
    for (const family of ["Inter", "Space Grotesk", "IBM Plex Mono"]) expect(css).toContain(`font-family: "${family}"`);
  });

  it("have their OFL licence beside them", () => {
    expect(readdirSync(join(dir, "licenses")).sort()).toEqual(["IBMPlexMono-OFL.txt", "Inter-OFL.txt", "SpaceGrotesk-OFL.txt"]);
  });

  it("are the same files as the landing page's", () => {
    const site = join(dir, "../../../../../site/fonts");
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".woff2"))) {
      expect(readFileSync(join(dir, file)).equals(readFileSync(join(site, file))), file).toBe(true);
    }
  });
});
