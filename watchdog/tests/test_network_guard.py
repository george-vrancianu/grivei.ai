"""The conftest guard (#175): a test cannot reach a public host, even by accident through a refresh/seed/fetch path. Nothing here leaves the machine."""
import socket
import urllib.request

import pytest
import requests

import conftest
from conftest import NetworkBlocked

pytestmark = pytest.mark.expects_network_block  # these tests provoke the guard on purpose


def test_a_connect_to_a_public_address_is_refused():
    with socket.socket() as s, pytest.raises(NetworkBlocked):
        s.connect(("93.184.216.34", 80))


def test_a_name_lookup_for_a_public_host_is_refused():
    with pytest.raises(NetworkBlocked):
        socket.getaddrinfo("data.gov.ro", 443)


def test_requests_and_urllib_fail_fast_on_a_public_url():
    with pytest.raises(NetworkBlocked):
        requests.get("https://data.gov.ro/api/3/action/package_search", timeout=5)
    with pytest.raises(NetworkBlocked):
        urllib.request.urlopen("http://example.com/", timeout=5)


def test_loopback_still_works():
    with socket.socket() as server:
        server.bind(("127.0.0.1", 0))
        server.listen(1)
        with socket.create_connection(server.getsockname(), timeout=5):
            pass


def test_a_unix_socket_still_works(tmp_path):
    path = str(tmp_path / "s")
    with socket.socket(socket.AF_UNIX) as server:
        server.bind(path)
        server.listen(1)
        with socket.socket(socket.AF_UNIX) as client:
            client.connect(path)


def test_connect_ex_to_a_public_address_is_refused():
    with socket.socket() as s, pytest.raises(NetworkBlocked):
        s.connect_ex(("93.184.216.34", 80))


def test_the_operators_restic_cloud_and_database_environment_is_scrubbed(monkeypatch):
    """The autouse fixture ran before this body: set the variables now and run the fixture's own function on them."""
    names = ("RESTIC_REPOSITORY", "RESTIC_PASSWORD", "AWS_SECRET_ACCESS_KEY", "B2_ACCOUNT_KEY", "PIPELINE_HEALTHCHECK_URL", "DATABASE_URL", "PGHOST", "PGPASSWORD")
    for name in names:
        monkeypatch.setenv(name, "x")
    monkeypatch.setenv("HOME_KEEP", "x")
    monkeypatch.setenv("PIPELINE_TEST_TIMEOUT", "5")
    assert all(conftest._scrubbed(n) for n in names)
    assert not conftest._scrubbed("PATH") and not conftest._scrubbed("PIPELINE_TEST_TIMEOUT") and not conftest._scrubbed("PIPELINE_RESTIC_BIN") and not conftest._scrubbed("HOME_KEEP")


def test_the_scrub_removes_the_variables_before_a_test_body_runs():
    import os
    # the real fixture ran for this test: nothing it scrubs may be set now, whatever the shell running pytest exported
    assert [n for n in os.environ if conftest._scrubbed(n)] == []

