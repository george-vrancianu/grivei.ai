"""The party-name equivalence table and the match it supports (#185, ADR 0012).

A donation's party is the text BaniPartide published; a Mandate's list and an alliance's member parties are AEP's registered names. `matches` says whether a
donation's party is the party of a Mandate:

- both names are written the same way first (`aep.read.key`: ASCII, upper case, letters and digits only), so case, diacritics, punctuation and spacing never matter;
- the donation's party matches when that key is the Mandate's list or one of the alliance's recorded member parties, directly or through an entry of the reviewed,
  versioned table `party_names.toml` (an abbreviation or a spelling of the registered name);
- a predecessor or successor party is never merged: `kept_apart` names are matched by their own key only, and the table refuses an alias that points at one;
- an independent leader's Mandate matches nothing, and an alliance matches a donation only through its own name or its recorded member parties.
"""
from __future__ import annotations

import tomllib
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from ..aep.read import key

PATH = Path(__file__).resolve().parent / "party_names.toml"


class PartyNamesError(ValueError):
    pass


@dataclass(frozen=True)
class PartyNames:
    version: int
    updated: str
    aliases: dict[str, tuple[str, ...]]  # key of the published name -> keys of the registered names it stands for
    kept_apart: frozenset[str]  # keys of the predecessor and successor parties that are never merged

    def registered(self, published: str) -> tuple[str, ...]:
        """The keys a donation's party can be: its own, and the registered names the table says it is written as."""
        own = key(published)
        return (own, *self.aliases.get(own, ()))


def load(path: Path = PATH) -> PartyNames:
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    version = data.get("version")
    if not isinstance(version, int) or version < 1:
        raise PartyNamesError("the party-name table needs an integer `version` of at least 1")
    kept_apart: set[str] = set()
    for entry in data.get("kept_apart", ()):
        if not str(entry.get("reason", "")).strip() or not key(entry.get("published", "")):
            raise PartyNamesError(f"kept_apart entry {entry!r} needs a `published` name and a `reason`")
        kept_apart.add(key(entry["published"]))
    aliases: dict[str, list[str]] = {}
    for entry in data.get("alias", ()):
        published, party, reason = (str(entry.get(f, "")).strip() for f in ("published", "party", "reason"))
        if not (key(published) and key(party) and reason):
            raise PartyNamesError(f"alias entry {entry!r} needs a `published` name, a `party` and a `reason`")
        if key(published) in kept_apart or key(party) in kept_apart:
            raise PartyNamesError(f"alias {published!r} -> {party!r} merges a predecessor or successor party the table keeps apart")
        if key(published) == key(party):
            raise PartyNamesError(f"alias {published!r} is the registered name itself: no entry needed")
        found = aliases.setdefault(key(published), [])
        if key(party) in found:
            raise PartyNamesError(f"alias {published!r} -> {party!r} is listed twice")
        found.append(key(party))
    return PartyNames(version, str(data.get("updated", "")), {k: tuple(v) for k, v in aliases.items()}, frozenset(kept_apart))


@lru_cache(maxsize=1)
def table() -> PartyNames:
    return load()


def matches(published: str, list_name: str, member_parties: tuple[str, ...] | list[str] = (), *, independent: bool = False, names: PartyNames | None = None) -> bool:
    """Whether a donation published under `published` went to the party of a Mandate with this list (`list_name`, as registered) and these recorded member parties."""
    if independent or not key(published):
        return False
    names = names or table()
    targets = {key(list_name), *(key(m) for m in member_parties)}
    targets.discard("")
    return any(k in targets for k in names.registered(published))
