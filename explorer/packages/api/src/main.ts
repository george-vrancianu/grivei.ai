// Entry point of the API container: DATABASE_URL, PORT (default 4000).
import pg from "pg";
import { createApi } from "./server.ts";
import { cachedStore } from "./cache.ts";
import { postgresStore } from "./store.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const port = Number(process.env.PORT ?? 4000);

const pool = new pg.Pool({ connectionString: url, max: 8 });
const store = cachedStore(postgresStore(pool), pool, { log: (m) => console.log(m) });
await store.sync(); // reads the load generation and starts warming the 2-character prefixes in the background
// a load (the pipeline's rebuild) is noticed on the next request; this also notices it, and re-warms, when nobody asks
const watch = setInterval(() => void store.sync(), 30_000);
watch.unref();
const server = await createApi(store).listen(port);
console.log(`api listening on :${port}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => void pool.end().then(() => process.exit(0)));
  });
}
