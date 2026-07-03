"""Tests for mikrotik_service.py bridge URL routing."""

import pytest
from unittest.mock import MagicMock


def _make_config(router_ip: str, api_port: int = 8728):
    """Create a minimal mock config with the fields _bridge_url reads."""
    cfg = MagicMock()
    cfg.router_ip = router_ip
    cfg.api_port = api_port
    return cfg


class TestBridgeUrl:
    """_bridge_url() must correctly route all three router_ip shapes."""

    def test_full_url_used_as_is(self):
        from app.services.mikrotik_service import _bridge_url
        cfg = _make_config("https://mikrotik.wi-bill.com")
        assert _bridge_url(cfg) == "https://mikrotik.wi-bill.com"

    def test_full_url_with_trailing_slash_stripped(self):
        from app.services.mikrotik_service import _bridge_url
        cfg = _make_config("http://mikrotik.wi-bill.com/")
        assert _bridge_url(cfg) == "http://mikrotik.wi-bill.com"

    def test_raw_ipv4_direct_http(self):
        from app.services.mikrotik_service import _bridge_url
        cfg = _make_config("192.168.88.1", 8728)
        assert _bridge_url(cfg) == "http://192.168.88.1:8728"

    def test_raw_ipv4_nonstandard_port(self):
        from app.services.mikrotik_service import _bridge_url
        cfg = _make_config("10.0.0.5", 8729)
        assert _bridge_url(cfg) == "http://10.0.0.5:8729"

    def test_raw_ipv6_direct_http(self):
        from app.services.mikrotik_service import _bridge_url
        cfg = _make_config("2001:db8::1", 8728)
        assert _bridge_url(cfg) == "http://2001:db8::1:8728"

    def test_hostname_tunnel_https(self):
        """Bare hostname (no scheme, not an IP) → https:// with no port."""
        from app.services.mikrotik_service import _bridge_url
        cfg = _make_config("isp-nairobi-nets.wi-bill.com", 8728)
        assert _bridge_url(cfg) == "https://isp-nairobi-nets.wi-bill.com"

    def test_short_hostname_tunnel_https(self):
        from app.services.mikrotik_service import _bridge_url
        cfg = _make_config("mybridge.local", 8728)
        assert _bridge_url(cfg) == "https://mybridge.local"
