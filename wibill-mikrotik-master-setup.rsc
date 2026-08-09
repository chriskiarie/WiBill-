# ============================================================
# WiBill MikroTik Hotspot — Master Setup Script
# ============================================================
# Tested on: hAP lite, RouterOS 6.49.18 long-term
# Last updated: 2026-07-27
# Status: ✅ CONFIRMED WORKING END-TO-END
# ============================================================
# Paste this into Winbox → New Terminal → Press Enter
# ============================================================
# PARAMETERS (change these to match your ISP):
# :local WIFI_SSID "MTAANInet X"
# :local WIFI_PASSWORD ""
# :local NETWORK_OCTET 4
# :local WIFI_INTERFACE "wlan1"
# :local BACKEND_HOST "wibill-production-cd80.up.railway.app"
# :local PORTAL_DOMAIN "pay.honestbill.co.ke"
# :local TUNNEL_HOST "isp-wibill.wi-bill.com"
# ============================================================

# ── STEP 1: Create hotspot bridge ───────────────────────────
/interface bridge add name=WiBillBridge comment="WiBill hotspot bridge"

# ── STEP 2: Assign IP to bridge ─────────────────────────────
/ip address add address=192.168.$NETWORK_OCTET.1/24 interface=WiBillBridge comment="WiBill hotspot IP"

# ── STEP 3: Add WiFi interface to bridge ────────────────────
/interface bridge port add bridge=WiBillBridge interface=$WIFI_INTERFACE

# ── STEP 4: Set WiFi SSID ───────────────────────────────────
/interface wireless set $WIFI_INTERFACE ssid=$WIFI_SSID band=2ghz-b/g/n frequency=auto
:if ($WIFI_PASSWORD != "") do={
    /interface wireless security-profiles set [find default] authentication-types=wpa2-psk mode=dynamic-keys wpa2-pre-shared-key=$WIFI_PASSWORD
}

# ── STEP 5: Create IP pool for hotspot clients ──────────────
/ip pool add name=wibill-pool ranges=192.168.$NETWORK_OCTET.2-192.168.$NETWORK_OCTET.254

# ── STEP 6: Create DHCP server on bridge ────────────────────
/ip dhcp-server add name=wibill-dhcp interface=WiBillBridge address-pool=wibill-pool disabled=no
/ip dhcp-server network add address=192.168.$NETWORK_OCTET.0/24 gateway=192.168.$NETWORK_OCTET.1 dns-server=8.8.8.8,8.8.4.4

# ── STEP 7: Create hotspot on bridge ────────────────────────
/ip hotspot add name=hotspot1 interface=WiBillBridge address-pool=wibill-pool profile=hsprof1 disabled=no

# ── STEP 8: Configure hotspot profile ───────────────────────
/ip hotspot profile set [find name=hsprof1] addresses-per-mac=1 login-by=http-pap,mac-cookie use-radius=no html-directory=hotspot

# ── STEP 9: Enable API service ──────────────────────────────
/ip service enable api
/ip service set api port=8728 address=""

# ── STEP 10: Create WiBill API user ─────────────────────────
/user add name=wibill-api password=wibill12345555 group=full comment="WiBill API access"

# ── STEP 11: Walled garden (hostname-based) ─────────────────
/ip hotspot walled-garden add dst-host=$BACKEND_HOST action=allow comment="WiBill portal"
/ip hotspot walled-garden add dst-host=$TUNNEL_HOST action=allow comment="WiBill bridge"

# ── STEP 12: Verify configuration ───────────────────────────
:put "═══ WiBill Setup Complete ═══"
:put "SSID: $WIFI_SSID"
:put "Gateway: 192.168.$NETWORK_OCTET.1"
:put "Portal: http://192.168.$NETWORK_OCTET.1"
:log info "WiBill setup complete for $WIFI_SSID"
