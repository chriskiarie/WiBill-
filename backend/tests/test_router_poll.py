"""Tests for router_poll_service.py — the router-initiated control plane."""

from datetime import datetime, timedelta, timezone as tz
from unittest.mock import MagicMock

import pytest

from app.services.router_poll_service import (
    router_status,
    resolve_ros_version,
    build_poll_snippet,
    build_poll_scheduler_block,
    render_action_line,
    _fetch_mode,
)


def _config(notes: str | None = None, last_poll_at: datetime | None = None):
    cfg = MagicMock()
    cfg.notes = notes
    cfg.last_poll_at = last_poll_at
    return cfg


def _action(action_id: int, action_type: str, payload: dict):
    a = MagicMock()
    a.id = action_id
    a.action_type = action_type
    a.payload = payload
    return a


class TestRouterStatus:
    def test_never_connected_when_no_poll(self):
        assert router_status(_config(last_poll_at=None)) == "never_connected"

    def test_online_within_90s(self):
        cfg = _config(last_poll_at=datetime.now(tz.utc) - timedelta(seconds=30))
        assert router_status(cfg) == "online"

    def test_offline_after_90s(self):
        cfg = _config(last_poll_at=datetime.now(tz.utc) - timedelta(seconds=300))
        assert router_status(cfg) == "offline"

    def test_naive_timestamp_treated_as_utc(self):
        cfg = _config(last_poll_at=datetime.utcnow() - timedelta(seconds=10))
        assert router_status(cfg) == "online"


class TestResolveRosVersion:
    def test_parses_routeros_6(self):
        assert resolve_ros_version(_config(notes="Board: hAP lite | RouterOS: 6.49.17")) == "6"

    def test_parses_routeros_7(self):
        assert resolve_ros_version(_config(notes="Board: hAP | RouterOS: 7.15.1")) == "7"

    def test_defaults_to_6(self):
        assert resolve_ros_version(_config(notes=None)) == "6"


class TestFetchMode:
    def test_ros6_https_needs_mode(self):
        assert _fetch_mode("6", "https://example.com") == " mode=https"

    def test_ros7_no_mode(self):
        assert _fetch_mode("7", "https://example.com") == ""

    def test_ros6_http_no_mode(self):
        assert _fetch_mode("6", "http://example.com") == ""


class TestRenderActionLine:
    def test_add_bypass_uses_comment_tag(self):
        line = render_action_line(_action(41, "add_bypass", {"mac_address": "AA:BB:CC:DD:EE:FF"}), "6")
        assert "wibill-action-41" in line
        assert "AA:BB:CC:DD:EE:FF" in line

    def test_remove_bypass_by_mac(self):
        line = render_action_line(_action(42, "remove_bypass", {"mac_address": "AA:BB:CC:DD:EE:FF"}), "6")
        assert 'mac-address="AA:BB:CC:DD:EE:FF"' in line

    def test_push_portal_fetch(self):
        line = render_action_line(_action(43, "push_portal", {"url": "https://x/y", "dst": "hotspot/login.html"}), "6")
        assert '/tool fetch url="https://x/y"' in line
        assert "dst-path=hotspot/login.html" in line


class TestBuildPollSnippet:
    def test_no_pending_actions_returns_noop_not_empty(self):
        out = build_poll_snippet(1, [], ros_version="6", base_url="https://example.com")
        assert "wibill: no pending actions" in out
        assert out.strip() != ""

    def test_ack_url_embedded_in_same_script(self):
        out = build_poll_snippet(1, [_action(41, "add_bypass", {"mac_address": "AA:BB:CC:DD:EE:FF"})], ros_version="6", poll_token="tok", base_url="https://example.com")
        assert "/poll/1/ack" in out
        assert "ids=41" in out
        assert "Authorization: Bearer tok" in out

    def test_ack_form_has_multiple_ids(self):
        actions = [
            _action(41, "add_bypass", {"mac_address": "AA:BB:CC:DD:EE:FF"}),
            _action(42, "remove_bypass", {"mac_address": "AA:BB:CC:DD:EE:FF"}),
        ]
        out = build_poll_snippet(1, actions, ros_version="6", base_url="https://example.com")
        assert "ids=41,42" in out


class TestBuildPollSchedulerBlock:
    def test_installs_script_scheduler_and_initial_run(self):
        out = build_poll_scheduler_block(7, "tok", ros_version="6", base_url="https://example.com")
        assert "wibill-poll-script" in out
        assert "interval=30s" in out
        assert "start-time=startup" in out
        assert "/system script run wibill-poll-script" in out

    def test_ros6_scheduler_fetch_has_mode(self):
        out = build_poll_scheduler_block(7, "tok", ros_version="6", base_url="https://example.com")
        assert "mode=https" in out

    def test_ros7_scheduler_fetch_no_mode(self):
        out = build_poll_scheduler_block(7, "tok", ros_version="7", base_url="https://example.com")
        assert "mode=https" not in out
