"""The conftest guard (#175): a test cannot reach a public host, even by accident through a refresh/seed/fetch path. Nothing here leaves the machine."""
import socket
import urllib.request

import pytest
import requests

from conftest import NetworkBlocked


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
