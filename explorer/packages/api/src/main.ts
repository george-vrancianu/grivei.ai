// Entry point of the API container: DATABASE_URL, PORT (default 4000), SEAP_BASE_URL (default https://e-licitatie.ro), SEAP_LINK_PUBLIC_BASE (default relative).
import pg from "pg";
import { createApi } from "./server.ts";
import { postgresStore } from "./store.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const port = Number(process.env.PORT ?? 4000);

const pool = new pg.Pool({ connectionString: url, max: 8 });
const server = await createApi(postgresStore(pool)).listen(port);
console.log(`api listening on :${port}`);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    server.close(() => void pool.end().then(() => process.exit(0)));
  });
}
