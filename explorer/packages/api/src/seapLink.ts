// "Check in SEAP" (spec #37, story 60): GET /source/seap/<code> answers 302 to the public e-licitatie page of a Record.
//
// A bulk file carries the public code (DA..., DAN..., CAN..., SCNA...) but not the id the public page's URL needs, so the link is
// made on demand: one e-licitatie list call per code finds the row whose code matches exactly, and the row carries the internal id
// (and, for a notice, its type and version, which pick the page). The answer is cached per code, so a second request for the same
// code makes no upstream call. Nothing here is a Record or a number we show: it is a router.
//
//   DA    POST /api-pub/DirectAcquisitionCommon/GetDirectAcquisitionList/   filter `uniqueIdentificationCode`, id `directAcquisitionId`
//         page  /pub/direct-acquisition/view/<id>
//   DAN   POST /api-pub/DaAwardNoticeCommon/GetDaAwardNoticeList/           filter `noticeNo`,                id `daAwardNoticeId`
//         page  /pub/direct-acquisition/award-notice/view/<id>
//   CAN, SCNA (a contract Record `CAN1069731~54202` links to its award notice `CAN1069731`)
//         POST /api-pub/NoticeCommon/GetCANoticeList/                       filter `number`,                  id `caNoticeId`
//         page  /pub/notices/<NOTICE_ROUTES[type, version]><id>
//
// The notice-type routes are the table the crawl uses to build a crawled Record's URL (watchdog/pipeline/crawl/records.py `_ROUTES`,
// mirrored from watchdog/sql/002_load_seap.sql); seapLink.test.ts reads that file and fails when the two drift.

/** The public page of a notice (type, legacy form?) under /pub/notices/. Version 1 is the legacy form; a missing version is the current one. */
export const NOTICE_ROUTES: Record<string, string> = {
  "3:legacy": "ca-notices/view-c/v1/",
  "3:current": "ca-notices/view-c/", // CAN
  "18:legacy": "ca-notices/view-scn/v1/",
  "18:current": "ca-notices/view-rfq/", // SCNA (sic: as the public list does)
  "13:legacy": "ca-notices/view-rfq/v1/",
  "13:current": "ca-notices/view-rfq/", // RFQ
  "20:legacy": "ca-notices/view-rfq/v1/",
  "20:current": "ca-notices/view-rfq/",
  "16:legacy": "ca-notices/view-pc/v1/",
  "16:current": "ca-notices-pc/view/", // PC
  "8:legacy": "ca-notices/view-dc/v1/",
  "8:current": "ca-notices-dc/view/", // DC
};

export const DIRECT_ACQUISITION_ROUTE = "direct-acquisition/view/";
export const DAN_ROUTE = "direct-acquisition/award-notice/view/";

export type CodeKind = "DA" | "DAN" | "CAN" | "SCNA";

export interface ParsedCode {
  kind: CodeKind;
  /** What the upstream list is asked for and must return exactly: the notice code, without a contract number. */
  code: string;
}

// Strict: the prefix and digits only. A contract Record's code adds `~<contract number>` (whatever the files print as a number, e.g. `1398514/1`, `9/2026` or `54202 bis`; any text on one line), which is dropped before anything goes upstream.
const SHAPES: { kind: CodeKind; re: RegExp }[] = [
  { kind: "DAN", re: /^(DAN\d{1,12})$/ },
  { kind: "DA", re: /^(DA\d{1,12})$/ },
  { kind: "CAN", re: /^(CAN\d{1,12})(?:~.{1,120})?$/ },
  { kind: "SCNA", re: /^(SCNA\d{1,12})(?:~.{1,120})?$/ },
];

/** The kind of a public code and the code to look up, or null for any shape we do not serve. */
export function parseCode(raw: string): ParsedCode | null {
  for (const { kind, re } of SHAPES) {
    const m = re.exec(raw);
    if (m) return { kind, code: m[1]! };
  }
  return null;
}

export interface SeapLinkOptions {
  /** The upstream site (env SEAP_BASE_URL); both the API calls and the redirect target are on it. */
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Per upstream call, ms. */
  timeoutMs?: number;
  /** Most codes remembered (oldest dropped first). */
  maxEntries?: number;
  /** How long "no such code" is remembered, ms. Failures are never remembered. */
  notFoundTtlMs?: number;
  now?: () => number;
}

export type LinkResult =
  | { status: 302; location: string }
  | { status: 404 | 502; body: string };

export interface SeapLink {
  /** Resolve a code (as it came in the URL, already percent-decoded) to the answer. Never throws. */
  resolve(raw: string): Promise<LinkResult>;
  /** Upstream calls made so far (tests). */
  readonly upstreamCalls: number;
}

export const DEFAULT_BASE_URL = "https://e-licitatie.ro";

/** The target a code resolves to, remembered per code: the page path under the site, or `null` for "no such code" (with an expiry). */
type Entry = { path: string | null; until: number };

export function createSeapLink(options: SeapLinkOptions = {}): SeapLink {
  const base = (options.baseUrl ?? process.env.SEAP_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const doFetch = options.fetch ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const maxEntries = options.maxEntries ?? 10_000;
  const notFoundTtlMs = options.notFoundTtlMs ?? 60_000;
  const now = options.now ?? Date.now;

  const cache = new Map<string, Entry>(); // insertion order = age; a hit is moved to the end
  const inFlight = new Map<string, Promise<Entry>>(); // concurrent requests for one code share one upstream call
  let upstreamCalls = 0;

  class UpstreamError extends Error {}

  async function post(path: string, body: unknown): Promise<{ items?: unknown }> {
    upstreamCalls += 1;
    let res: Response;
    try {
      res = await doFetch(`${base}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json", referer: `${base}/pub`, "user-agent": "grivei-seap-link/0.1" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      throw new UpstreamError(e instanceof Error ? e.message : "request failed");
    }
    if (!res.ok) throw new UpstreamError(`HTTP ${res.status}`);
    try {
      const json = (await res.json()) as unknown;
      if (typeof json !== "object" || json === null) throw new Error("not an object");
      return json as { items?: unknown };
    } catch {
      throw new UpstreamError("not JSON");
    }
  }

  const rows = (answer: { items?: unknown }): Record<string, unknown>[] =>
    Array.isArray(answer.items) ? answer.items.filter((r): r is Record<string, unknown> => typeof r === "object" && r !== null) : [];
  const idOf = (v: unknown): number | null => (typeof v === "number" && Number.isSafeInteger(v) && v > 0 ? v : null);

  /** Ask once; the page path under the site, or null when no row carries exactly this code (or its page is not known). */
  async function lookup({ kind, code }: ParsedCode): Promise<string | null> {
    if (kind === "DA") {
      const answer = await post("/api-pub/DirectAcquisitionCommon/GetDirectAcquisitionList/", {
        pageSize: 10, pageIndex: 0, showOngoingDa: false, cookieContext: null, sysDirectAcquisitionStateId: null,
        publicationDateStart: null, publicationDateEnd: null, sortProperties: [], sysDirectAcquisitionTypeId: null,
        directAcquisitionName: null, uniqueIdentificationCode: code,
      });
      const id = idOf(rows(answer).find((r) => r.uniqueIdentificationCode === code)?.directAcquisitionId);
      return id === null ? null : `/pub/${DIRECT_ACQUISITION_ROUTE}${id}`;
    }
    if (kind === "DAN") {
      const answer = await post("/api-pub/DaAwardNoticeCommon/GetDaAwardNoticeList/", { pageIndex: 0, pageSize: 10, noticeNo: code });
      const id = idOf(rows(answer).find((r) => r.noticeNo === code)?.daAwardNoticeId);
      return id === null ? null : `/pub/${DAN_ROUTE}${id}`;
    }
    const answer = await post("/api-pub/NoticeCommon/GetCANoticeList/", {
      sysNoticeTypeIds: [], sortProperties: [], pageIndex: 0, pageSize: 10, number: code, startPublicationDate: null, endPublicationDate: null,
    });
    const row = rows(answer).find((r) => r.noticeNo === code);
    const id = idOf(row?.caNoticeId);
    const type = row?.sysNoticeTypeId;
    if (id === null || typeof type !== "number") return null;
    // a missing version is the current form, as the crawl does; version 1 is the legacy one
    const version = typeof row?.sysNoticeVersionId === "number" ? row.sysNoticeVersionId : 2;
    const route = NOTICE_ROUTES[`${type}:${version === 1 ? "legacy" : "current"}`];
    return route ? `/pub/notices/${route}${id}` : null; // a type without a known page gets no link rather than a wrong one
  }

  function remember(key: string, entry: Entry) {
    cache.delete(key);
    cache.set(key, entry);
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value!);
  }

  async function entryFor(parsed: ParsedCode): Promise<Entry> {
    const key = parsed.code;
    const hit = cache.get(key);
    if (hit && hit.until > now()) {
      remember(key, hit);
      return hit;
    }
    const pending = inFlight.get(key);
    if (pending) return pending;
    const run = (async () => {
      const path = await lookup(parsed);
      // a found id is stable; "not found" is only remembered briefly (the notice may be published a little later)
      const entry: Entry = { path, until: path === null ? now() + notFoundTtlMs : Infinity };
      remember(key, entry);
      return entry;
    })().finally(() => inFlight.delete(key));
    inFlight.set(key, run);
    return run;
  }

  return {
    get upstreamCalls() {
      return upstreamCalls;
    },
    async resolve(raw) {
      const parsed = parseCode(raw);
      if (!parsed) return { status: 404, body: "Unknown code.\n" };
      try {
        const { path } = await entryFor(parsed);
        return path === null ? { status: 404, body: "No such code in SEAP.\n" } : { status: 302, location: `${base}${path}` };
      } catch (e) {
        if (!(e instanceof UpstreamError)) console.error(e);
        return { status: 502, body: "SEAP did not answer.\n" };
      }
    },
  };
}

/**
 * The URL a bulk Record's provenance carries: this endpoint, for the codes it serves; null for any other shape.
 * Relative (`/source/seap/<code>`, same origin as the app) unless a public base is given (env SEAP_LINK_PUBLIC_BASE).
 */
export function seapLinkUrl(code: string, publicBase: string | undefined = process.env.SEAP_LINK_PUBLIC_BASE): string | null {
  if (!parseCode(code)) return null;
  return `${(publicBase ?? "").replace(/\/+$/, "")}/source/seap/${encodeURIComponent(code)}`;
}

/** The code in `/source/seap/<code>` (percent-decoded), or null when the path is not that route. */
export function codeFromPath(pathname: string): string | null | undefined {
  const m = /^\/source\/seap\/([^/]*)$/.exec(pathname);
  if (!m) return undefined; // not this route
  try {
    return decodeURIComponent(m[1]!);
  } catch {
    return null; // this route, but the code is not valid text
  }
}
