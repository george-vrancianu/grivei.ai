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


def notice_item(**over):
    """One GetCANoticeList item, as the API returns it (only the fields the connector reads)."""
    item = {"caNoticeId": 100639197, "noticeId": 1, "procedureId": 2, "noticeNo": "SCNA1134543",
            "sysNoticeTypeId": 18, "sysNoticeVersionId": 2, "sysNoticeState": None, "sysProcedureState": None,
            "contractingAuthorityNameAndFN": "X", "contractTitle": "T", "sysAcquisitionContractType": None,
            "sysProcedureType": None, "sysContractAssigmentType": None, "cpvCodeAndName": "C",
            "ronContractValue": 1.0, "noticeStateDate": "2025-01-01T00:00:00", "isOnline": True,
            "currencyCode": "RON", "estimatedValueExport": None}
    item.update(over)
    return item


def test_award_notices_keep_the_notice_version(http):
    _, replies = http
    replies.append({"items": [notice_item(sysNoticeVersionId=1)], "total": 1, "searchTooLong": False})
    [n] = seap_harvest.award_notices(3289, "2025-01-01", "2025-01-31")
    assert (n["typeId"], n["versionId"]) == (18, 1)
