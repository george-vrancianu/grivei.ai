import { createServer, type IncomingMessage, type Server } from "node:http";
import { execute, GraphQLError, type GraphQLSchema } from "graphql";
import { loadSchema } from "@grivei/contract/node";
import { loadPersistedQueries, type PersistedQuery } from "./persisted.ts";
import { rootValue } from "./resolvers.ts";
import type { Store } from "./store.ts";
import { codeFromPath, createSeapLink, type SeapLink } from "./seapLink.ts";

export interface ApiResponse {
  status: number;
  body: { data?: unknown; errors?: { message: string; extensions?: Record<string, unknown> }[] };
}

const MAX_BODY_BYTES = 64 * 1024;

const refuse = (status: number, code: string, message: string): ApiResponse => ({
  status,
  body: { errors: [{ message, extensions: { code } }] },
});

export interface Api {
  /** One request body (already JSON-parsed) -> the response. Only persisted queries run. */
  respond(body: unknown, options?: { signal?: AbortSignal }): Promise<ApiResponse>;
  listen(port: number, host?: string): Promise<Server>;
}

/**
 * The API answers persisted queries only: the client sends `{ "id": <sha256 of the document>, "variables": {...} }`.
 * Anything carrying query text, or an id that is not on the contract's allowlist, is refused with HTTP 400.
 */
export function createApi(store: Store, schema: GraphQLSchema = loadSchema(), options: { seapLink?: SeapLink } = {}): Api {
  const seapLink = options.seapLink ?? createSeapLink();
  const queries = loadPersistedQueries(schema);
  const root = rootValue(store);

  async function respond(body: unknown, options: { signal?: AbortSignal } = {}): Promise<ApiResponse> {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return refuse(400, "BAD_REQUEST", "The request body must be a JSON object.");
    }
    const { id, query, variables } = body as { id?: unknown; query?: unknown; variables?: unknown };
    if (query !== undefined) {
      return refuse(400, "PERSISTED_QUERY_ONLY", "Query text is not accepted. Send the id of a persisted query.");
    }
    if (typeof id !== "string") return refuse(400, "PERSISTED_QUERY_REQUIRED", "Send the id of a persisted query.");
    const persisted: PersistedQuery | undefined = queries.get(id);
    if (!persisted) return refuse(400, "PERSISTED_QUERY_NOT_FOUND", "That id is not on the persisted-query allowlist.");
    if (variables !== undefined && (typeof variables !== "object" || variables === null || Array.isArray(variables))) {
      return refuse(400, "BAD_REQUEST", "variables must be an object.");
    }
    const result = await execute({
      schema,
      document: persisted.document,
      rootValue: root,
      contextValue: { signal: options.signal }, // aborted when the client disconnects: the running statement is cancelled
      variableValues: (variables ?? {}) as Record<string, unknown>,
    });
    return {
      status: 200,
      body: {
        ...(result.data !== undefined ? { data: result.data } : {}),
        ...(result.errors ? { errors: result.errors.map(formatError) } : {}),
      },
    };
  }

  return {
    respond,
    listen(port, host = "0.0.0.0") {
      const server = createServer(async (req, res) => {
        const send = (status: number, payload: unknown) => {
          res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
          res.end(JSON.stringify(payload));
        };
        // The client went away before the answer: abort, which cancels the statement Postgres is running for it.
        const gone = new AbortController();
        res.on("close", () => {
          if (!res.writableFinished) gone.abort();
        });
        try {
          if (req.method === "GET" && req.url === "/healthz") return send(200, { ok: true });
          // "Check in SEAP": GET /source/seap/<code> redirects to the public page (seapLink.ts); no GraphQL involved
          const sourceCode = req.method === "GET" || req.method === "HEAD" ? codeFromPath((req.url ?? "").split("?")[0]!) : undefined;
          if (sourceCode !== undefined) {
            const r = sourceCode === null ? { status: 404 as const, body: "Unknown code.\n" } : await seapLink.resolve(sourceCode);
            if (gone.signal.aborted) return;
            if (r.status === 302) res.writeHead(302, { location: r.location, "cache-control": "no-store" }).end();
            else res.writeHead(r.status, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }).end(req.method === "HEAD" ? undefined : r.body);
            return;
          }
          if (req.method !== "POST" || !req.url?.startsWith("/graphql")) {
            return send(404, { errors: [{ message: "POST /graphql", extensions: { code: "NOT_FOUND" } }] });
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(await readBody(req));
          } catch (e) {
            const tooBig = e instanceof Error && e.message === "too-big";
            const r = refuse(tooBig ? 413 : 400, tooBig ? "BODY_TOO_LARGE" : "BAD_REQUEST", tooBig ? "Request body too large." : "The body is not valid JSON.");
            return send(r.status, r.body);
          }
          const r = await respond(parsed, { signal: gone.signal });
          if (!gone.signal.aborted) send(r.status, r.body);
        } catch (e) {
          console.error(e);
          send(500, { errors: [{ message: "Internal error", extensions: { code: "INTERNAL" } }] });
        }
      });
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(port, host, () => resolve(server));
      });
    },
  };
}

function formatError(e: GraphQLError) {
  const code = e.extensions?.code;
  // No code and no thrown error behind it: graphql-js itself rejected the request (variable coercion, validation).
  if (!code && !e.originalError) {
    return { message: e.message, extensions: { code: "BAD_USER_INPUT" }, ...(e.path ? { path: e.path } : {}) };
  }
  // Resolver and database failures are logged, never echoed to the client.
  if (!code) {
    console.error(e);
    return { message: "Internal error", extensions: { code: "INTERNAL" }, ...(e.path ? { path: e.path } : {}) };
  }
  return { message: e.message, extensions: { code }, ...(e.path ? { path: e.path } : {}) };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("too-big"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
