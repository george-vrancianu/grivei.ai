"""Rebuild beside the live database, check it, switch over (ADR 0004, #82).

The rebuild is one transaction that drops and recreates the `seap` and `core` schemas, so run against the live database it holds
exclusive locks for hours and the API stalls. Instead the graph is built into a fresh database in the same cluster, `<db>_next`
(a full copy of the graph beside the live one; the live database is not touched while it builds), checked, and only then swapped
in by renaming: the live `<db>` becomes `<db>_prev` and `<db>_next` becomes `<db>`. The swap is two renames and a session
termination, so the API sees a moment of refused connections and its pool reconnects to the new graph (its cache checks the load
generation, which differs). A database is the unit because every query is schema-qualified and a database rename moves the BM25
index with it, untouched.

`<db>_prev` is the fallback: kept until the next successful switchover replaces it or `cleanup` drops it; `rollback` swaps it back
(and back again, it is symmetric). A failed check leaves `<db>` serving and `<db>_next` in place for a look (`cleanup`, or the
next build, drops it). A major Postgres/ParadeDB upgrade is the same idea one level up: a rebuild into a new cluster on a new
volume, `verify`, then repoint DATABASE_URL (watchdog/README.md).

Needs a role that may create databases and terminate sessions (the compose `grivei` role is the superuser).
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable

import psycopg
from psycopg import sql
from psycopg.conninfo import conninfo_to_dict, make_conninfo

NEXT, PREV = "_next", "_prev"
MIN_RATIO = 0.95  # the new graph may hold at most 5% fewer Records than the one it replaces (Records are only ever added: the archive is append-only)
RENAME_ATTEMPTS = 20  # a session that reconnects between the termination and the rename is terminated again


class SwitchoverRefused(Exception):
    """The new graph failed its checks: the live one keeps serving."""

    def __init__(self, failures: list[str]):
        super().__init__("; ".join(failures))
        self.failures = failures


@dataclass
class Names:
    live: str
    admin_url: str
    live_url: str
    next_url: str
    prev_url: str

    @property
    def next(self) -> str:
        return self.live + NEXT

    @property
    def prev(self) -> str:
        return self.live + PREV


def names_of(db_url: str) -> Names:
    live = conninfo_to_dict(db_url).get("dbname")
    if not live or live in ("postgres", "template0", "template1"):
        raise ValueError(f"cannot switch over a database named {live!r}: use a dedicated one (compose: grivei)")
    return Names(live, make_conninfo(db_url, dbname="postgres"), db_url, make_conninfo(db_url, dbname=live + NEXT), make_conninfo(db_url, dbname=live + PREV))


def _exists(admin: psycopg.Connection, name: str) -> bool:
    return admin.execute("SELECT 1 FROM pg_database WHERE datname = %s", (name,)).fetchone() is not None


def _drop(admin: psycopg.Connection, name: str) -> None:
    if _exists(admin, name):
        admin.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(name)))


def _rename(admin: psycopg.Connection, old: str, new: str) -> None:
    """Rename a database that sessions may be using: refuse new connections, terminate the sessions, rename; repeat if one slipped in."""
    admin.execute(sql.SQL("ALTER DATABASE {} WITH ALLOW_CONNECTIONS false").format(sql.Identifier(old)))
    for attempt in range(RENAME_ATTEMPTS):
        admin.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s AND pid <> pg_backend_pid()", (old,))
        try:
            admin.execute(sql.SQL("ALTER DATABASE {} RENAME TO {}").format(sql.Identifier(old), sql.Identifier(new)))
            return
        except psycopg.errors.ObjectInUse:
            time.sleep(0.05 * (attempt + 1))
    raise RuntimeError(f"database {old} is still in use after {RENAME_ATTEMPTS} attempts")


def _allow(admin: psycopg.Connection, name: str, allowed: bool) -> None:
    admin.execute(sql.SQL("ALTER DATABASE {} WITH ALLOW_CONNECTIONS {}").format(sql.Identifier(name), sql.SQL("true" if allowed else "false")))


def _database_exists_at(url: str) -> bool:
    with psycopg.connect(make_conninfo(url, dbname="postgres"), autocommit=True, connect_timeout=10) as admin:
        return _exists(admin, conninfo_to_dict(url)["dbname"])


def _graph_counts(url: str) -> dict[str, int] | None:
    """Record, search-row and entity counts of a database; None when it holds no graph (no `seap.record` yet)."""
    try:
        with psycopg.connect(url, connect_timeout=10) as c:
            return {
                "records": c.execute("SELECT count(*) FROM seap.record").fetchone()[0],
                "search": c.execute("SELECT count(*) FROM seap.search").fetchone()[0],
                "entities": c.execute("SELECT count(*) FROM core.entity").fetchone()[0],
            }
    except (psycopg.errors.UndefinedTable, psycopg.errors.InvalidSchemaName, psycopg.errors.InvalidCatalogName):
        return None


def check_graph(url: str, against: str | None = None, min_ratio: float = MIN_RATIO) -> list[str]:
    """The checks a new graph passes before it is served; the failures (empty = all passed). `against` is the graph it would replace."""
    failures: list[str] = []
    try:
        counts = _graph_counts(url)
        if counts is None:
            return ["no graph in the database (seap.record or core.entity missing)"]
        if counts["records"] == 0:
            failures.append("no Records loaded")
        if counts["search"] < counts["records"]:
            failures.append(f"search rows ({counts['search']}) fewer than Records ({counts['records']}): every Record has at least one")
        if counts["entities"] == 0:
            failures.append("no entities built")
        with psycopg.connect(url, connect_timeout=10) as c:
            if c.execute("SELECT count(*) FROM seap.rollup_meta").fetchone()[0] != 1:
                failures.append("no load generation (seap.rollup_meta): the API's cache could not tell this load from the last")
            if c.execute("SELECT 1 FROM pg_indexes WHERE schemaname = 'seap' AND indexname = 'search_bm25'").fetchone() is None:
                failures.append("the search index (search_bm25) is missing")
            else:  # the index answers and agrees with the table (a corrupt or half-built one would not)
                indexed = c.execute("SELECT count(*) FROM seap.search WHERE id @@@ pdb.all()").fetchone()[0]
                if indexed != counts["search"]:
                    failures.append(f"the search index holds {indexed} rows, the table {counts['search']}")
        if against and not failures:
            if not _database_exists_at(against):  # never skip the floor because the live database is gone: that is an interrupted swap, not a first build
                return [f"the live database ({conninfo_to_dict(against).get('dbname')}) does not exist: nothing to compare with and nothing to switch (an interrupted swap? the next run or `pipeline rollback` restores the old graph)"]
            before = _graph_counts(against)
            if before and before["records"] and counts["records"] < before["records"] * min_ratio:
                failures.append(f"{counts['records']} Records, but the graph it would replace has {before['records']} (floor {min_ratio:.0%}): the archive lost data or a quarter failed to load")
    except psycopg.Error as e:
        failures.append(f"a check could not run: {type(e).__name__}: {e}")
    return failures


def _say_default(line: str) -> None:
    print(line, flush=True)


def build_and_switch(db_url: str, build: Callable[[str, Callable[[], None]], object], *, say: Callable[[str], None] = _say_default,
                     check: Callable[[str, str | None], list[str]] = check_graph) -> object:
    """`build(next_url, gate)` builds the graph into a fresh `<db>_next` and calls `gate()` once it has committed (before reporting
    anything as finished); if `check(next_url, live_url)` finds nothing wrong the databases are swapped, else `SwitchoverRefused` and
    the live database is untouched. A `build` that never calls the gate is checked after it returns. Returns what `build` returned."""
    n = names_of(db_url)
    with psycopg.connect(n.admin_url, autocommit=True) as admin:
        recover(n, say, admin)  # before anything is dropped or built: an interrupted swap must not leave the API without a database for the hours of a build
        if _exists(admin, n.next):
            say(f"switchover: dropping the leftover {n.next} of an earlier build")
            _drop(admin, n.next)
        admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(n.next)))
    with psycopg.connect(n.next_url, autocommit=True) as c:
        c.execute("CREATE EXTENSION IF NOT EXISTS pg_search")
    say(f"switchover: building into {n.next} beside the live {n.live} (the live one keeps serving)")
    checked = []

    def gate() -> None:
        if checked:
            return
        say(f"switchover: checking {n.next}")
        failures = check(n.next_url, n.live_url)
        if failures:
            for f in failures:
                say(f"switchover: CHECK FAILED: {f}")
            say(f"switchover: REFUSED; {n.live} keeps serving, {n.next} is kept for a look (`pipeline cleanup` or the next build drops it)")
            raise SwitchoverRefused(failures)
        checked.append(True)
        say("switchover: checks passed")

    result = build(n.next_url, gate)
    gate()
    swap_in(n, say)
    return result


def _rename_plain(admin: psycopg.Connection, old: str, new: str) -> None:
    admin.execute(sql.SQL("ALTER DATABASE {} RENAME TO {}").format(sql.Identifier(old), sql.Identifier(new)))


def recover(n: Names, say: Callable[[str], None] = _say_default, admin: psycopg.Connection | None = None) -> bool:
    """A swap that was killed (or lost its connection) between its renames leaves no `<db>`: put the graph that was live back, so the
    API has a database again, before anything else runs. That graph is `<db>_swap` (a rollback) or else `<db>_prev` (a switchover).
    Returns whether it repaired anything."""
    if admin is None:
        with psycopg.connect(n.admin_url, autocommit=True) as own:
            return recover(n, say, own)
    if _exists(admin, n.live):
        return False
    for name in (n.live + SWAP, n.prev):
        if _exists(admin, name):
            say(f"switchover: REPAIR: no {n.live} (an earlier swap was interrupted); restoring the old graph from {name}")
            _rename_plain(admin, name, n.live)
            _allow(admin, n.live, True)
            return True
    return False


def swap_in(n: Names, say: Callable[[str], None] = _say_default) -> None:
    """`<db>` -> `<db>_prev` (replacing the previous fallback), `<db>_next` -> `<db>`. Whatever stops it between the two renames
    (an error, SIGTERM as SystemExit), the old graph is put back under `<db>` before it propagates; a kill -9 is repaired by `recover`."""
    with psycopg.connect(n.admin_url, autocommit=True) as admin:
        recover(n, say, admin)
        _drop(admin, n.prev)
        had_live = _exists(admin, n.live)
        started = time.monotonic()
        if had_live:
            _rename(admin, n.live, n.prev)
        try:
            _rename(admin, n.next, n.live)
            _allow(admin, n.live, True)
            if had_live:
                _allow(admin, n.prev, True)  # nobody points at the name `_prev`: it can be inspected
        except BaseException:
            _undo(admin, n, n.prev if had_live else None, say)
            raise
        say(f"switchover: DONE, {n.live} is the new graph" + (f"; the old one is kept as {n.prev} (`pipeline rollback` swaps it back, `pipeline cleanup` drops it); {time.monotonic() - started:.2f}s without a database" if had_live else ""))


def _undo(admin: psycopg.Connection, n: Names, old: str | None, say: Callable[[str], None]) -> None:
    """Never leave the API without a database: if `<db>` is gone, the graph kept as `old` takes its name back (`<db>_next` stays for a
    look). If `<db>` is already the new graph the swap did happen, and only the connections are re-allowed."""
    try:
        if old and not _exists(admin, n.live):
            _rename_plain(admin, old, n.live)
        if _exists(admin, n.live):
            _allow(admin, n.live, True)
    except psycopg.Error as e:  # a dropped admin connection: `recover` repairs it at the next run
        say(f"switchover: could not undo a half-done swap ({type(e).__name__}); the next run or `pipeline rollback` repairs it")


SWAP = "_swap"


def rollback(db_url: str, say: Callable[[str], None] = _say_default) -> None:
    """Swap `<db>` and `<db>_prev`: the graph before the last switchover serves again, the one being rolled back is kept as `<db>_prev`."""
    n = names_of(db_url)
    tmp = n.live + SWAP
    with psycopg.connect(n.admin_url, autocommit=True) as admin:
        recover(n, say, admin)
        if not _exists(admin, n.prev):
            raise LookupError(f"no {n.prev} to roll back to (it is dropped by `cleanup` and replaced by every switchover)")
        started = time.monotonic()
        had_live = _exists(admin, n.live)
        if had_live:
            _rename(admin, n.live, tmp)
        try:
            _rename(admin, n.prev, n.live)  # terminates a session someone has open on the fallback, like the live one
            _allow(admin, n.live, True)
        except BaseException:
            if had_live:  # the graph that was live goes back: never leave the API without a database
                if _exists(admin, n.live):
                    _rename_plain(admin, tmp, n.prev)  # the fallback did get in: finish the swap rather than undo half of it
                    _allow(admin, n.prev, True)
                else:
                    _rename_plain(admin, tmp, n.live)
                _allow(admin, n.live, True)
            raise
        if had_live:
            _rename_plain(admin, tmp, n.prev)
            _allow(admin, n.prev, True)
        say(f"rollback: DONE, {n.live} is the graph from before the last switchover; the one rolled back is kept as {n.prev} ({time.monotonic() - started:.2f}s without a database)")


def cleanup(db_url: str, say: Callable[[str], None] = _say_default) -> list[str]:
    """Drop `<db>_prev` and `<db>_next`; returns what was dropped. The live database is never touched."""
    n = names_of(db_url)
    dropped = []
    with psycopg.connect(n.admin_url, autocommit=True) as admin:
        recover(n, say, admin)  # an interrupted swap's only copy of the live graph may be `<db>_prev`: restore it before dropping anything
        for name in (n.next, n.prev):
            if _exists(admin, name):
                _drop(admin, name)
                dropped.append(name)
    say(f"cleanup: dropped {', '.join(dropped)}" if dropped else f"cleanup: no {n.prev} or {n.next} to drop")
    return dropped
