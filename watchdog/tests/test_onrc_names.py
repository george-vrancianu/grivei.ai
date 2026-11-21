"""The supplier resolver asks ONRC about a unit's CUIs once, before the unit's Records are resolved (#302). Pure: a fake cursor answers from a dict.
Nothing here counts statements: after the prefetch the cursor refuses every query, so a passing resolution proves it asked none."""
from types import SimpleNamespace

from pipeline.identity import Override, Overrides, Resolver, compare_name
from pipeline.onrc.build import OnrcNames

ALFA, BETA, GAMMA, DELTA, AUTH = "2000007", "1000009", "54760", "3286536", "16310091"
ONRC = {ALFA: "ALFA SRL", BETA: "BETA SA"}  # GAMMA and DELTA are in no register


class FakeCursor:
    def __init__(self, registrations):
        self.registrations, self.refuse, self._rows = registrations, False, []

    def execute(self, sql, params):
        if self.refuse:
            raise AssertionError("a query during resolution")
        if "ANY" in sql:
            self._rows = [(c, self.registrations[c]) for c in params[0] if c in self.registrations]
        else:
            self._rows = [(self.registrations[params[0]],)] if params[0] in self.registrations else []

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def fetchall(self):
        return self._rows


def rec(authority, *winners):
    return SimpleNamespace(authority_cui=authority, all_winners=[SimpleNamespace(name=n, cui=c) for n, c in winners])


def test_a_unit_is_resolved_without_a_query_after_its_prefetch_and_to_the_same_identities():
    records = [rec(AUTH, ("Alfa", "RO 2000007"), ("Beta", BETA)), rec(AUTH, ("Gamma", GAMMA), ("Delta", "0003286536")), rec(AUTH, ("Alfa", ALFA))]
    anaf = {BETA: compare_name("Beta SA")}
    per_record = Resolver(OnrcNames(FakeCursor(ONRC), anaf))
    expected = [per_record.supplier(n, c, r.authority_cui) for r in records for n, c in [(w.name, w.cui) for w in r.all_winners]]

    cursor = FakeCursor(ONRC)
    names = OnrcNames(cursor, anaf)
    resolver = Resolver(names)
    names.prefetch(resolver.asked_cuis(records))
    cursor.refuse = True
    got = [resolver.supplier(w.name, w.cui, r.authority_cui) for r in records for w in r.all_winners]
    assert got == expected
    assert [g.identity for g in got] == ["CUI", "CUI", "NAME_ONLY", "NAME_ONLY", "CUI"]  # ALFA is ONRC-confirmed, GAMMA and DELTA are in no register


def test_a_cui_keyed_override_is_prefetched_too():
    overrides = Overrides(by_name={"alfa": Override(reason="r", key=ALFA)}, by_id={})
    records = [rec(AUTH, ("alfa", None))]
    cursor = FakeCursor(ONRC)
    names = OnrcNames(cursor, {})
    resolver = Resolver(names, overrides)
    names.prefetch(resolver.asked_cuis(records))
    cursor.refuse = True
    assert resolver.supplier("alfa", None, AUTH).key == ALFA


def test_the_authoritys_own_cui_and_a_published_id_override_are_not_asked():
    overrides = Overrides(by_id={BETA: Override(reason="r", key=ALFA)})
    resolver = Resolver(OnrcNames(FakeCursor({}), {}), overrides)
    asked = resolver.asked_cuis([rec(AUTH, ("Auth", AUTH), ("Beta", BETA), ("Delta", DELTA), ("Foreign", "DE123456789"), ("Person", "1234567890123"))])
    assert DELTA in asked and AUTH not in asked and BETA not in asked and "DE123456789" not in asked and "1234567890123" not in asked
