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


# --- Result cap: split the date range -------------------------------------------------------------

DA_DATES = ("finalizationDateStart", "finalizationDateEnd")
NOTICE_DATES = ("startPublicationDate", "endPublicationDate")


def da_row(id):
    return {"directAcquisitionId": id, "uniqueIdentificationCode": f"DA{id}", "directAcquisitionName": "x",
            "sysDirectAcquisitionState": {"text": "Acceptata"}, "cpvCode": "x", "publicationDate": "p",
            "finalizationDate": "f", "supplier": "s", "contractingAuthority": "ca",
            "estimatedValueRon": 1, "closingValue": 1}


def notice_row(id, type_id=3, version_id=2):
    return {"caNoticeId": id, "noticeId": id, "procedureId": id, "noticeNo": f"CAN{id}", "sysNoticeTypeId": type_id,
            "sysNoticeVersionId": version_id, "sysNoticeState": None, "sysProcedureState": None, "contractingAuthorityNameAndFN": "ca",
            "contractTitle": "t", "sysAcquisitionContractType": None, "sysProcedureType": None,
            "sysContractAssigmentType": None, "cpvCodeAndName": "c", "ronContractValue": 1,
            "noticeStateDate": "d", "isOnline": True, "currencyCode": "RON", "estimatedValueExport": 1}


@pytest.fixture
def server(monkeypatch):
    """A fake list endpoint. `answer(day_from, day_to, page_index, page_size)` returns the JSON for that page;
    the days are the date part of the request's window. Returns the list of every request's (from, to, index, size)."""
    seen, state = [], {}

    def post(url, json=None, **kwargs):
        start, end = state["dates"]
        q = (json[start][:10], json[end][:10], json["pageIndex"], json["pageSize"])
        seen.append(q)
        return FakeResponse(state["answer"](*q))

    def configure(dates, answer):
        state["dates"], state["answer"] = dates, answer
        return seen

    monkeypatch.setattr(seap_harvest.requests, "post", post)
    monkeypatch.setattr(seap_harvest.time, "sleep", lambda s: None)
    return configure


def test_direct_acquisitions_split_a_range_over_the_cap_in_halves(server):
    def answer(d_from, d_to, page, size):
        if (d_from, d_to) == ("2024-01-01", "2024-01-04"):
            return {"items": [da_row(9)] * 100, "total": 2000, "searchTooLong": True}
        rows = {"2024-01-01": [da_row(1), da_row(2)], "2024-01-03": [da_row(3)]}[d_from]
        return {"items": rows, "total": len(rows), "searchTooLong": False}

    seen = server(DA_DATES, answer)
    das = seap_harvest.direct_acquisitions(3289, "2024-01-01", "2024-01-04")
    assert sorted(d["id"] for d in das) == [1, 2, 3]
    assert [s[:2] for s in seen] == [("2024-01-01", "2024-01-04"), ("2024-01-01", "2024-01-02"),
                                     ("2024-01-03", "2024-01-04")]


def test_direct_acquisitions_raise_when_a_single_day_is_over_the_cap(server):
    server(DA_DATES, lambda *q: {"items": [da_row(1)] * 1000, "total": 2000, "searchTooLong": True})
    with pytest.raises(RuntimeError, match="2024-01-01: one day is over the 2000 result cap"):
        seap_harvest.direct_acquisitions(3289, "2024-01-01", "2024-01-02")


def test_award_notices_split_at_the_cap_and_dedupe_across_windows(server):
    def answer(d_from, d_to, page, size):
        if d_from != d_to:  # a total at the cap is suspect even without the flag
            return {"items": [notice_row(9)] * 1000, "total": 3000, "searchTooLong": False}
        rows = {"2024-03-01": [notice_row(1), notice_row(2)], "2024-03-02": [notice_row(2), notice_row(3)]}[d_from]
        return {"items": rows, "total": len(rows), "searchTooLong": False}

    server(NOTICE_DATES, answer)
    notices = seap_harvest.award_notices(3289, "2024-03-01", "2024-03-02")
    assert sorted(n["caNoticeId"] for n in notices) == [1, 2, 3]


def test_award_notices_page_by_1000_until_the_total(server):
    def answer(d_from, d_to, page, size):
        return {"items": [notice_row(page * size + k) for k in range(min(size, 1500 - page * size))],
                "total": 1500, "searchTooLong": False}

    seen = server(NOTICE_DATES, answer)
    notices = seap_harvest.award_notices(3289, "2024-03-01", "2024-03-31")
    assert len(notices) == 1500
    assert [s[2:] for s in seen] == [(0, 1000), (1, 1000)]


def test_award_notices_keep_the_notice_version(server):
    server(NOTICE_DATES, lambda *q: {"items": [notice_row(1, type_id=18, version_id=1)], "total": 1,
                                     "searchTooLong": False})
    [n] = seap_harvest.award_notices(3289, "2025-01-01", "2025-01-31")
    assert (n["typeId"], n["versionId"]) == (18, 1)


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
