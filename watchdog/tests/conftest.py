import sys
from pathlib import Path

WATCHDOG = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(WATCHDOG / "connectors"))
sys.path.insert(0, str(WATCHDOG))  # the `pipeline` package


# ---- guards for every test: no outbound network, and a per-test deadline that kills a hung run -------------------------------

import faulthandler  # noqa: E402
import ipaddress  # noqa: E402
import os  # noqa: E402
import socket  # noqa: E402

import pytest  # noqa: E402

TEST_TIMEOUT = int(os.environ.get("PIPELINE_TEST_TIMEOUT", "600"))  # seconds per test; 0 turns the deadline off


class NetworkBlocked(RuntimeError):
    """A test tried to reach a non-local host. Stub the fetch (every connector takes an `http`/`post` seam) or mark the test `@pytest.mark.network`."""


def _is_local(host) -> bool:
    if isinstance(host, bytes):
        host = host.decode()
    if host in (None, "", "localhost", "ip6-localhost"):
        return True
    try:
        return ipaddress.ip_address(host.split("%")[0]).is_loopback
    except ValueError:
        return False


def pytest_configure(config):
    config.addinivalue_line("markers", "network: the test may open outbound connections (the network guard is lifted)")


@pytest.fixture(autouse=True)
def _no_outbound_network(request, monkeypatch):
    """Block outbound connections at the socket level (urllib, requests and httpx all end here): only loopback and unix sockets pass, so a local
    test server or a throwaway Postgres on localhost still works. A test that must go out says so with `@pytest.mark.network`."""
    if request.node.get_closest_marker("network"):
        return
    real_connect, real_connect_ex, real_getaddrinfo = socket.socket.connect, socket.socket.connect_ex, socket.getaddrinfo

    def refuse(target):
        raise NetworkBlocked(f"outbound network blocked in tests: {target!r}")

    def connect(self, address):
        if self.family in (socket.AF_INET, socket.AF_INET6) and not _is_local(address[0]):
            refuse(address)
        return real_connect(self, address)

    def connect_ex(self, address):
        if self.family in (socket.AF_INET, socket.AF_INET6) and not _is_local(address[0]):
            refuse(address)
        return real_connect_ex(self, address)

    def getaddrinfo(host, *args, **kwargs):
        if not _is_local(host):
            refuse(host)
        return real_getaddrinfo(host, *args, **kwargs)

    monkeypatch.setattr(socket.socket, "connect", connect)
    monkeypatch.setattr(socket.socket, "connect_ex", connect_ex)
    monkeypatch.setattr(socket, "getaddrinfo", getaddrinfo)


@pytest.fixture(autouse=True)
def _test_deadline():
    """A test still running after TEST_TIMEOUT seconds dumps every thread's traceback and kills the process (no pytest-timeout dependency)."""
    if TEST_TIMEOUT > 0:
        faulthandler.dump_traceback_later(TEST_TIMEOUT, exit=True)
    yield
    if TEST_TIMEOUT > 0:
        faulthandler.cancel_dump_traceback_later()
