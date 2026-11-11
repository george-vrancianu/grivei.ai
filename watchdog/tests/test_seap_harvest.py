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


def notice_row(id):
    return {"caNoticeId": id, "noticeId": id, "procedureId": id, "noticeNo": f"CAN{id}", "sysNoticeTypeId": 3,
            "sysNoticeState": None, "sysProcedureState": None, "contractingAuthorityNameAndFN": "ca",
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
