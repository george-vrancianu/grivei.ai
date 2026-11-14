// Entry point of the API container: DATABASE_URL, PORT (default 4000), API_CACHE_MAX_MB (result cache budget, default 300), SEAP_BASE_URL (default https://e-licitatie.ro), SEAP_LINK_PUBLIC_BASE (default relative), GRIVEI_RESTRICTED (only the exact value `show` reveals Restricted content, ADR 0015; unset or anything else hides it).
import pg from "pg";
import { createApi } from "./server.ts";
import { cachedStore } from "./cache.ts";
import { postgresStore } from "./store.ts";
import { restrictedShown } from "./restricted.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const port = Number(process.env.PORT ?? 4000);

const pool = new pg.Pool({ connectionString: url, max: 8 });
// A switchover (pipeline rebuild, #82) terminates the sessions of the old database: an idle one errors here, and without a listener that would end the process. The pool reconnects to the new graph on the next query.
pool.on("error", (e) => console.error(`pg pool: idle connection lost (${e.message}); reconnecting on the next query`));
const store = cachedStore(postgresStore(pool), pool, { maxBytes: Number(process.env.API_CACHE_MAX_MB ?? 300) * 1024 * 1024, log: (m) => console.log(m) });
await store.sync(); // reads the load generation and starts warming the 2-character prefixes in the background
// a load (the pipeline's rebuild) is noticed on the next request; this also notices it, and re-warms, when nobody asks
const watch = setInterval(() => void store.sync(), 30_000);
watch.unref();
const server = await createApi(store).listen(port);
console.log(`api listening on :${port}; Restricted content ${restrictedShown() ? "SHOWN (a Private view: never on the open public host)" : "hidden"}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => void pool.end().then(() => process.exit(0)));
  });
}
