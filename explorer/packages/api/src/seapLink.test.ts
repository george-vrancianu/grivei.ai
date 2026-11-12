// Seam 2 for the SEAP link redirect: a fake e-licitatie (node:http) answers the list calls; the real API server in front answers GET /source/seap/<code>.
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApi } from "./server.ts";
import { createSeapLink, NOTICE_ROUTES, parseCode, seapLinkUrl, type SeapLink } from "./seapLink.ts";
import type { Store } from "./store.ts";

interface Call { path: string; body: Record<string, unknown>; referer: string | undefined }

let upstream: Server;
let upstreamBase = "";
let calls: Call[] = [];
let answer: (call: Call) => { status?: number; json?: unknown; text?: string } = () => ({ json: { total: 0, items: [] } });

const listRow = (over: Record<string, unknown>) => ({ total: 1, items: [over] });

beforeAll(async () => {
  upstream = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const call = { path: req.url ?? "", body: JSON.parse(Buffer.concat(chunks).toString() || "{}"), referer: req.headers.referer };
      calls.push(call);
      const a = answer(call);
      res.writeHead(a.status ?? 200, { "content-type": "application/json" });
      res.end(a.text ?? JSON.stringify(a.json));
    });
  });
  await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
  upstreamBase = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => upstream.close(() => r())));
beforeEach(() => {
  calls = [];
  answer = () => ({ json: { total: 0, items: [] } });
});

const noStore = {} as Store; // the redirect never touches the store

async function withApi<T>(link: SeapLink, run: (get: (path: string, method?: string) => Promise<Response>) => Promise<T>): Promise<T> {
  const server = await createApi(noStore, undefined, { seapLink: link }).listen(0, "127.0.0.1");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    return await run((path, method = "GET") => fetch(`${base}${path}`, { method, redirect: "manual" }));
  } finally {
    server.close();
    server.closeAllConnections();
  }
}
const newLink = (over: Parameters<typeof createSeapLink>[0] = {}) => createSeapLink({ baseUrl: upstreamBase, ...over });

describe("the code kinds, each resolved with one upstream call", () => {
  it("DA: uniqueIdentificationCode on the direct-acquisition list, page by internal id", async () => {
    answer = () => ({ json: listRow({ directAcquisitionId: 109774337, uniqueIdentificationCode: "DA28897629" }) });
    await withApi(newLink(), async (get) => {
      const r = await get("/source/seap/DA28897629");
      expect(r.status).toBe(302);
      expect(r.headers.get("location")).toBe(`${upstreamBase}/pub/direct-acquisition/view/109774337`);
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.path).toBe("/api-pub/DirectAcquisitionCommon/GetDirectAcquisitionList/");
    expect(calls[0]!.body.uniqueIdentificationCode).toBe("DA28897629");
    expect(calls[0]!.referer).toBe(`${upstreamBase}/pub`);
  });

  it("DAN: noticeNo on the direct-acquisition award-notice list", async () => {
    answer = () => ({ json: listRow({ daAwardNoticeId: 101420153, noticeNo: "DAN2351525" }) });
    await withApi(newLink(), async (get) => {
      const r = await get("/source/seap/DAN2351525");
      expect(r.status).toBe(302);
      expect(r.headers.get("location")).toBe(`${upstreamBase}/pub/direct-acquisition/award-notice/view/101420153`);
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.path).toBe("/api-pub/DaAwardNoticeCommon/GetDaAwardNoticeList/");
    expect(calls[0]!.body.noticeNo).toBe("DAN2351525");
    expect(calls[0]!.referer).toBe(`${upstreamBase}/pub`);
  });

  it("CAN: number on the award-notice list, page by notice type and version", async () => {
    answer = () => ({ json: listRow({ caNoticeId: 100500, noticeNo: "CAN1069731", sysNoticeTypeId: 3, sysNoticeVersionId: 2 }) });
    await withApi(newLink(), async (get) => {
      const r = await get("/source/seap/CAN1069731");
      expect(r.headers.get("location")).toBe(`${upstreamBase}/pub/notices/ca-notices/view-c/100500`);
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.path).toBe("/api-pub/NoticeCommon/GetCANoticeList/");
    expect(calls[0]!.body.number).toBe("CAN1069731");
    expect(calls[0]!.referer).toBe(`${upstreamBase}/pub`);
  });

  it("SCNA: current form goes to the RFQ page", async () => {
    answer = () => ({ json: listRow({ caNoticeId: 100237462, noticeNo: "SCNA1058867", sysNoticeTypeId: 18, sysNoticeVersionId: 2 }) });
    await withApi(newLink(), async (get) => {
      expect((await get("/source/seap/SCNA1058867")).headers.get("location")).toBe(`${upstreamBase}/pub/notices/ca-notices/view-rfq/100237462`);
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]!.body.number).toBe("SCNA1058867");
  });

  it("a contract Record's code links to its award notice, and only the notice code goes upstream", async () => {
    answer = () => ({ json: listRow({ caNoticeId: 7, noticeNo: "CAN1073017", sysNoticeTypeId: 3, sysNoticeVersionId: 2 }) });
    await withApi(newLink(), async (get) => {
      const r = await get(`/source/seap/${encodeURIComponent("CAN1073017~1398514/1")}`);
      expect(r.status).toBe(302);
      expect(r.headers.get("location")).toBe(`${upstreamBase}/pub/notices/ca-notices/view-c/7`);
    });
    expect(calls[0]!.body.number).toBe("CAN1073017");
  });
});

describe("the page per notice type and version", () => {
  const cases: [number, number | null, string][] = [
    [3, 1, "ca-notices/view-c/v1/"], [3, 2, "ca-notices/view-c/"], [3, null, "ca-notices/view-c/"],
    [18, 1, "ca-notices/view-scn/v1/"], [18, 2, "ca-notices/view-rfq/"],
    [13, 1, "ca-notices/view-rfq/v1/"], [13, 2, "ca-notices/view-rfq/"],
    [16, 1, "ca-notices/view-pc/v1/"], [16, 2, "ca-notices-pc/view/"],
    [8, 1, "ca-notices/view-dc/v1/"], [8, 2, "ca-notices-dc/view/"],
  ];
  it.each(cases)("type %i version %s -> %s", async (type, version, route) => {
    answer = () => ({ json: listRow({ caNoticeId: 55, noticeNo: "CAN1", sysNoticeTypeId: type, sysNoticeVersionId: version }) });
    const r = await newLink().resolve("CAN1");
    expect(r).toEqual({ status: 302, location: `${upstreamBase}/pub/notices/${route}55` });
  });

  it("a type with no known page gets no link rather than a wrong one", async () => {
    answer = () => ({ json: listRow({ caNoticeId: 55, noticeNo: "CAN2", sysNoticeTypeId: 99, sysNoticeVersionId: 2 }) });
    expect((await newLink().resolve("CAN2")).status).toBe(404);
  });

  it("agrees with the crawl's table (watchdog/pipeline/crawl/records.py _ROUTES)", () => {
    const py = readFileSync(new URL("../../../../watchdog/pipeline/crawl/records.py", import.meta.url), "utf8");
    const block = /_ROUTES = \{([\s\S]*?)\n\}/.exec(py)![1]!;
    const fromPython: Record<string, string> = {};
    for (const m of block.matchAll(/\((\d+), (True|False)\): "([^"]+)"/g)) fromPython[`${m[1]}:${m[2] === "True" ? "legacy" : "current"}`] = m[3]!;
    expect(Object.keys(fromPython).length).toBeGreaterThan(8);
    expect(NOTICE_ROUTES).toEqual(fromPython);
  });
});

describe("one lookup per code", () => {
  it("a second request for the same code makes no upstream call", async () => {
    answer = () => ({ json: listRow({ directAcquisitionId: 1, uniqueIdentificationCode: "DA1" }) });
    const link = newLink();
    await withApi(link, async (get) => {
      expect((await get("/source/seap/DA1")).status).toBe(302);
      expect((await get("/source/seap/DA1")).status).toBe(302);
      expect((await get("/source/seap/DA1", "HEAD")).status).toBe(302);
    });
    expect(calls).toHaveLength(1);
    expect(link.upstreamCalls).toBe(1);
  });

  it("concurrent requests for one code share the call", async () => {
    answer = () => ({ json: listRow({ directAcquisitionId: 1, uniqueIdentificationCode: "DA2" }) });
    const link = newLink();
    await Promise.all([link.resolve("DA2"), link.resolve("DA2"), link.resolve("DA2")]);
    expect(calls).toHaveLength(1);
  });

  it("the cache is bounded: the oldest code is asked for again", async () => {
    answer = (c) => ({ json: listRow({ directAcquisitionId: 1, uniqueIdentificationCode: c.body.uniqueIdentificationCode }) });
    const link = newLink({ maxEntries: 2 });
    for (const c of ["DA1", "DA2", "DA3", "DA1"]) await link.resolve(c);
    expect(calls).toHaveLength(4);
  });
});

describe("the upstream is not hammered through the public route", () => {
  it("never more than maxConcurrent lookups in flight; the overflow is 503 with Retry-After and no upstream call", async () => {
    let inFlight = 0;
    let peak = 0;
    const release: (() => void)[] = [];
    const slowFetch: typeof fetch = async (_u, init) => {
      const body = JSON.parse(String(init?.body)) as { uniqueIdentificationCode: string };
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise<void>((r) => release.push(r));
      inFlight -= 1;
      return new Response(JSON.stringify(listRow({ directAcquisitionId: 1, uniqueIdentificationCode: body.uniqueIdentificationCode })), { status: 200 });
    };
    const link = createSeapLink({ baseUrl: upstreamBase, fetch: slowFetch, maxConcurrent: 2 });
    await withApi(link, async (get) => {
      const first = [get("/source/seap/DA1"), get("/source/seap/DA2")];
      await new Promise((r) => setTimeout(r, 50));
      const over = await get("/source/seap/DA3");
      expect(over.status).toBe(503);
      expect(over.headers.get("retry-after")).toBe("2");
      expect(over.headers.get("cache-control")).toBe("no-store");
      expect(link.upstreamCalls).toBe(2);
      expect(peak).toBe(2);
      release.splice(0).forEach((r) => r());
      expect((await Promise.all(first)).map((r) => r.status)).toEqual([302, 302]);
      // the refused code was not remembered: once a slot is free it is looked up
      const again = get("/source/seap/DA3");
      await new Promise((r) => setTimeout(r, 50));
      release.splice(0).forEach((r) => r());
      expect((await again).status).toBe(302);
      expect(link.upstreamCalls).toBe(3);
    });
  });

  it("an upstream answer over the size cap is a 502", async () => {
    const link = createSeapLink({ baseUrl: upstreamBase, maxBodyBytes: 10, fetch: async () => new Response(JSON.stringify({ items: [], pad: "x".repeat(50) })) });
    expect((await link.resolve("DA9")).status).toBe(502);
  });
});

describe("answers that are not a redirect", () => {
  it("a code that is not on SEAP: 404, remembered only briefly", async () => {
    let t = 0;
    const link = newLink({ now: () => t, notFoundTtlMs: 1000 });
    await withApi(link, async (get) => {
      const r = await get("/source/seap/DA999");
      expect(r.status).toBe(404);
      expect(await r.text()).toMatch(/No such code/);
      await get("/source/seap/DA999");
      expect(calls).toHaveLength(1);
      t = 2000;
      await get("/source/seap/DA999");
      expect(calls).toHaveLength(2);
    });
  });

  it("only an exact match counts: a row for another code is not a hit", async () => {
    answer = () => ({ json: listRow({ directAcquisitionId: 5, uniqueIdentificationCode: "DA9999" }) });
    expect((await newLink().resolve("DA99")).status).toBe(404);
  });

  it.each(["", "X1", "da1", "DA", "DA1;DROP", "DA1 ", "CAN1~", "DA1~2", "DAN1~2", "CAN1/../x", "RFQA1", "DA1234567890123", "http://evil.example", "//evil.example"])(
    "a bad code %j is 404 and never reaches upstream",
    async (code) => {
      await withApi(newLink(), async (get) => {
        const r = await get(`/source/seap/${encodeURIComponent(code)}`);
        expect(r.status).toBe(404);
        expect(r.headers.get("location")).toBeNull();
      });
      expect(calls).toHaveLength(0);
    },
  );

  it("an undecodable code and extra path segments are 404", async () => {
    await withApi(newLink(), async (get) => {
      expect((await get("/source/seap/%E0%A4%A")).status).toBe(404);
      expect((await get("/source/seap/DA1/extra")).status).toBe(404);
      expect((await get("/source/other/DA1")).status).toBe(404);
    });
    expect(calls).toHaveLength(0);
  });

  it("an upstream error is 502 and is not remembered", async () => {
    answer = () => ({ status: 500, text: "boom" });
    const link = newLink();
    await withApi(link, async (get) => {
      expect((await get("/source/seap/DA7")).status).toBe(502);
      answer = () => ({ json: listRow({ directAcquisitionId: 7, uniqueIdentificationCode: "DA7" }) });
      expect((await get("/source/seap/DA7")).status).toBe(302);
    });
    expect(calls).toHaveLength(2);
  });

  it("an answer that is not JSON, and a timeout, are 502", async () => {
    answer = () => ({ text: "<html>" });
    expect((await newLink().resolve("DA8")).status).toBe(502);
    const slow = createSeapLink({ baseUrl: upstreamBase, timeoutMs: 20, fetch: (_u, init) => new Promise((_, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("timeout")))) });
    expect((await slow.resolve("DA8")).status).toBe(502);
  });

  it("an unreachable upstream is 502", async () => {
    expect((await createSeapLink({ baseUrl: "http://127.0.0.1:1" }).resolve("DA1")).status).toBe(502);
  });

  it("POST to the route is not a redirect", async () => {
    await withApi(newLink(), async (get) => expect((await get("/source/seap/DA1", "POST")).status).toBe(404));
  });
});

describe("the link a bulk Record carries", () => {
  it("is the redirect path, percent-encoded, for the codes it serves", () => {
    expect(seapLinkUrl("DA28897629", "")).toBe("/source/seap/DA28897629");
    expect(seapLinkUrl("CAN1073017~1398514/1", "")).toBe("/source/seap/CAN1073017~1398514%2F1");
    expect(seapLinkUrl("DAN1", "https://grivei.example/")).toBe("https://grivei.example/source/seap/DAN1");
    expect(seapLinkUrl("RFQA1", "")).toBeNull();
  });
  it("parses the four kinds", () => {
    expect(["DA1", "DAN1", "CAN1", "SCNA1"].map((c) => parseCode(c)?.kind)).toEqual(["DA", "DAN", "CAN", "SCNA"]);
  });
});
