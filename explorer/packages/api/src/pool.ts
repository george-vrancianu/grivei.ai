import pg from "pg";

/**
 * The API's one way to make a pool. A database restart, crash or switchover (#82) drops connections, and pg reports a dropped
 * connection as an `error` event, which ends the process when nothing listens. pg-pool listens for idle clients only: it removes its
 * listener while a client is checked out, and pg emits the event after the running statement has already failed. So every client gets
 * its own listener for its whole life. A dead client is discarded by the pool, the next query opens a fresh connection.
 */
export function createPool(options: pg.PoolConfig, log: (message: string) => void = (m) => console.error(m)): pg.Pool {
  const pool = new pg.Pool(options);
  pool.on("error", (e) => log(`pg pool: idle connection lost (${e.message}); reconnecting on the next query`));
  pool.on("connect", (client) => {
    client.on("error", (e) => log(`pg client: connection lost (${e.message}); the pool drops it and reconnects on the next query`));
  });
  return pool;
}
