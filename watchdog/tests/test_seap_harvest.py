"""Connector tests. The HTTP layer (`requests.get` / `requests.post`) is stubbed; no test touches the network."""
import pytest

import seap_harvest


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self.payload


@pytest.fixture
def http(monkeypatch):
    """Records every outgoing request and answers with the payloads queued in `replies`, in order."""
    calls, replies = [], []

    def fake(method):
        def send(url, **kwargs):
            calls.append({"method": method, "url": url, **kwargs})
            return FakeResponse(replies.pop(0) if replies else {})
        return send

    monkeypatch.setattr(seap_harvest.requests, "get", fake("GET"))
    monkeypatch.setattr(seap_harvest.requests, "post", fake("POST"))
    return calls, replies


def test_get_sends_the_pub_referer(http):
    calls, _ = http
    seap_harvest.get("/api-pub/anything")
    assert calls[0]["headers"]["Referer"] == "https://e-licitatie.ro/pub"


def test_post_sends_the_pub_referer(http):
    calls, _ = http
    seap_harvest.post("/api-pub/anything", {"pageIndex": 0})
    assert calls[0]["headers"]["Referer"] == "https://e-licitatie.ro/pub"


def test_find_authority_prefers_the_exact_name_match(http):
    _, replies = http
    replies.append({"items": [
        {"id": 111, "text": "RO4384206 MUNICIPIUL BRASOV - DIRECTIA FISCALA"},
        {"id": 3289, "text": "4384206 MUNICIPIUL BRASOV"},
    ]})
    ca = seap_harvest.find_authority("municipiul brasov")
    assert (ca["seapId"], ca["cui"], ca["name"]) == (3289, "4384206", "MUNICIPIUL BRASOV")


def contract(cid):
    """A GetCANoticeContracts item, trimmed to the fields the connector reads."""
    return {"noticeNo": "ADV1", "caNoticeContractId": cid, "contractNo": f"C{cid}", "contractDate": "2024-05-01",
            "contractTitle": "t", "lotsNoCaption": "1", "lotsCaption": "Lot 1", "contractValue": 10.0,
            "currency": {"text": "RON"}, "defaultCurrencyContractValue": 10.0,
            "winners": [{"name": "SC X SRL", "fiscalNumber": "123", "entityId": 9, "address": {}}]}


def test_contracts_for_pages_until_total(http, monkeypatch):
    monkeypatch.setattr(seap_harvest, "PAUSE", 0)
    calls, replies = http
    replies += [{"items": [contract(1), contract(2)], "total": 3}, {"items": [contract(3)], "total": 3}]
    out = seap_harvest.contracts_for({"caNoticeId": 42})
    assert [c["id"] for c in out] == [1, 2, 3]
    assert [(c["json"]["skip"], c["json"]["take"]) for c in calls] == [(0, 1000), (2, 1000)]


def test_contracts_for_fails_on_an_empty_page_before_total(http, monkeypatch):
    monkeypatch.setattr(seap_harvest, "PAUSE", 0)
    _, replies = http
    replies += [{"items": [contract(1)], "total": 3}, {"items": [], "total": 3}]
    with pytest.raises(RuntimeError, match="42"):
        seap_harvest.contracts_for({"caNoticeId": 42})


@pytest.fixture
def flaky_post(monkeypatch):
    """Stubs `post`: each notice id fails as many times as `failures[id]` says, then answers one contract."""
    monkeypatch.setattr(seap_harvest, "PAUSE", 0)
    monkeypatch.setattr(seap_harvest, "RETRY_PAUSE", 0)
    failures, calls = {}, []

    def post(path, body):
        nid = body["caNoticeId"]
        calls.append(nid)
        if failures.get(nid, 0) > 0:
            failures[nid] -= 1
            raise seap_harvest.requests.HTTPError("502 Bad Gateway")
        return {"items": [contract(nid)], "total": 1}

    monkeypatch.setattr(seap_harvest, "post", post)
    return failures, calls


def test_all_contracts_retries_a_flaky_notice(flaky_post):
    failures, _ = flaky_post
    failures[2] = 2
    out = seap_harvest.all_contracts([{"caNoticeId": 1}, {"caNoticeId": 2}])
    assert [c["id"] for c in out] == [1, 2]


def test_all_contracts_fails_the_run_when_a_notice_keeps_failing(flaky_post):
    failures, calls = flaky_post
    failures[2] = 99
    with pytest.raises(seap_harvest.requests.HTTPError):
        seap_harvest.all_contracts([{"caNoticeId": 1}, {"caNoticeId": 2}, {"caNoticeId": 3}])
    assert calls.count(2) == seap_harvest.RETRIES + 1
    assert 3 not in calls
