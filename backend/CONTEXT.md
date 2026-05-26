# HonestBill — Project Context & Mission
## Living Document — Updated as of Day 1 Build Session

---

## The Mission

Build a **multi-tenant SaaS hotspot billing platform** that lets independent ISPs in Kenya (and eventually East Africa) deploy branded captive portals, accept M-Pesa payments, and manage MikroTik hotspot access — automatically. The platform owner (Chris) runs the infrastructure. ISPs plug in. WiFi users pay. Everyone gets exactly what they paid for — no more, no less.

**The core insight no existing system has:**
Network availability is a first-class citizen in every billing decision. If the internet is down, the portal says so honestly — no pay button, no false promises. This is not a feature. It is the product.

---

## The Problem Being Solved

Current ISP billing systems (CloudTik, Konnect, ISPBillingsystem.co.ke, Lipanet) have two critical failures:

1. **Dishonest billing** — Users pay for internet that isn't working. The billing layer has zero awareness of network state. Money goes through, internet doesn't come through. Customers feel scammed.

2. **Ass UIs** — Existing portals are outdated, inflexible, and not customizable per ISP. ISPs have no identity. Every portal looks the same.

HonestBill fixes both at the architectural level — not as an afterthought.

---

## Business Model

| Actor | Role |
|---|---|
| **Chris (Platform Owner)** | Owns and runs HonestBill infrastructure. Onboards ISPs. Earns 10% of every transaction across all tenants. |
| **ISP (Tenant)** | Small/independent ISP with MikroTik router and internet to sell. Pays 10% commission per transaction. Gets a full dashboard, branded portal, and automated billing. |
| **WiFi User (End Customer)** | Connects to hotspot. Hits captive portal. Picks a package. Pays M-Pesa. Gets internet. No account needed. |

**Revenue math:**
- ISP doing Ksh 50,000/month → Chris earns Ksh 5,000/month from that ISP
- 10 ISPs → Ksh 50,000/month passive
- 50 ISPs → Ksh 250,000/month passive
- Revenue scales with zero additional infrastructure cost per new ISP

**Future:** Flat monthly SaaS fee + lower transaction % for high-volume ISPs. Regional expansion to Uganda, Tanzania.

---

## The Core Transaction Flow

```
1. User connects to ISP WiFi (MikroTik hotspot)
2. MikroTik intercepts HTTP traffic → redirects to:
   https://pay.honestbill.co.ke/portal/{isp_slug}?mac=XX:XX:XX&ip=192.168.x.x
3. Portal loads → backend immediately checks ISP uplink status
   - UP → show packages normally
   - DOWN → show honest status banner, no pay button
4. User selects package → enters M-Pesa phone number → hits PAY
5. Backend calls Daraja STK Push → M-Pesa prompt on user's phone
6. User enters M-Pesa PIN → Safaricom calls callback URL
7. Backend receives callback → ResultCode=0 → payment confirmed
8. Backend calls MikroTik RouterOS API → adds hotspot user with MAC + duration
9. Internet opens on user's device automatically
10. Transaction recorded: amount, platform fee (10%), ISP earnings (90%)
11. APScheduler checks expiring sessions every 60s → removes expired users from MikroTik
12. User gets kicked → redirected back to portal → can buy again
```

---

## Three UI Surfaces

### 1. Platform Super-Admin Dashboard (Chris's dashboard)
- See all ISPs (tenants), their status, revenue, activity
- Onboard new ISPs manually (Phase 1) / self-service (Phase 2)
- Platform-wide revenue: total transactions, platform fees earned, ISP balances
- Full visibility into every transaction across all tenants
- Manage commission rates per ISP
- Suspend/activate ISPs

### 2. ISP Admin Dashboard
- ISP-specific login — can only see their own data
- Live transaction feed with M-Pesa receipts
- Active sessions list with expiry countdowns
- Package management: add, edit, enable/disable, set prices
- Revenue summary: gross, platform fee deducted, net earnings, withdrawable balance
- MikroTik config management
- Voucher/code system (Phase 2)
- Network uptime history
- Reports: revenue by day/week/month, peak hours, top packages

### 3. Captive Portal (WiFi user-facing)
- Per-ISP branded (logo, colors, custom design)
- Mobile-first, pure HTML — loads on any device, any connection speed
- **Screen 1:** Network status banner — always shown first. Green = up, Red = down with no pay option
- **Screen 2:** Package selection cards (name, price KSH, duration)
- **Screen 3:** Phone number entry + PAY button
- **Screen 4:** Waiting for M-Pesa confirmation (3s polling, 90s timeout)
- **Screen 5:** Success — receipt shown, session timer countdown
- Chris has built a portal wizard (`xbill-portal-wizard-v2.html`) that ISPs use to design their custom portal — this will be integrated into ISP onboarding in Phase 2

---

## System Architecture

### Layers
```
L0 — Client Layer
     Captive Portal (FastAPI serves Jinja2 HTML)
     ISP Dashboard (Next.js)
     Platform Admin (Next.js)

L1 — API Gateway
     FastAPI (single process, monolith for MVP)
     JWT auth middleware
     Rate limiting (slowapi)
     CORS policy
     Safaricom IP whitelist (callbacks only)

L2 — Core Services
     network_checker.py    — ICMP ping per tenant, 60s interval
     mikrotik_service.py   — librouteros: add/remove hotspot users
     daraja_service.py     — STK Push + callback handling
     session_service.py    — session lifecycle management
     crypto_service.py     — Fernet encrypt/decrypt for secrets at rest

L3 — Background Jobs (APScheduler, in-process)
     session_expiry.py     — checks every 60s, kicks expired users
     network_poller.py     — pings ISP uplinks every 60s

L4 — Data Layer
     PostgreSQL (primary)
     Redis (rate limiting, session cache)
     Alembic (migrations)
     SQLAlchemy async ORM

L5 — External APIs
     Safaricom Daraja API  — STK Push + callback
     MikroTik RouterOS API — librouteros
     Postmark              — transactional email (Phase 2)
     Africa's Talking      — SMS (Phase 2)

L6 — Infrastructure
     Railway (FastAPI + Postgres + Redis)
     Vercel (Next.js dashboards)
     Cloudflare (DNS + WAF + HTTPS — free tier)
     Docker (local dev)
     GitHub Actions (CI/CD)
```

### Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Backend | Python 3.11 + FastAPI | Chris knows Python. Async. Fast. |
| Database | PostgreSQL 16 | ACID transactions for financial data |
| ORM | SQLAlchemy 2.0 async | Type-safe, async-native |
| Migrations | Alembic | Schema version control |
| Scheduler | APScheduler | In-process jobs, no Kafka needed for MVP |
| Payments | M-Pesa Daraja API | Kenya's payment rail. STK Push. |
| Router control | librouteros | RouterOS API Python client |
| Encryption | cryptography (Fernet) | Secrets encrypted at rest |
| Auth | python-jose + passlib | JWT + bcrypt |
| Portal templates | Jinja2 | Server-side HTML, no JS framework |
| Rate limiting | slowapi | FastAPI middleware |
| Frontend | Next.js 14 | ISP + admin dashboards |
| Email | Postmark | Phase 2 |
| SMS | Africa's Talking | Phase 2 |
| Local dev | Docker Compose | Postgres + Redis |
| Hosting | Railway + Vercel | Deploy from git push |
| DNS/WAF | Cloudflare | Free HTTPS + basic DDoS protection |

---

## Database Schema (9 Tables)

```
tenants              — ISPs on the platform (root of all data)
admin_users          — Platform admins (tenant_id=NULL) + ISP admins (tenant_id=set)
packages             — Plans each ISP offers (price, duration, devices)
sessions             — Every hotspot access attempt (pending→active→expired)
transactions         — Financial ledger (amount, platform_fee, isp_earnings, mpesa_receipt UNIQUE)
network_events       — ISP uplink history (up/down/degraded, latency)
mpesa_configs        — Per-ISP Daraja credentials (all encrypted with Fernet)
mikrotik_configs     — Per-ISP router connection details (password encrypted)
mpesa_callbacks      — Raw Daraja callbacks (append-only audit log, never deleted)
```

---

## Security Architecture (Non-Negotiable)

- **Fernet encryption at rest** — MikroTik passwords, M-Pesa credentials. Never stored plain.
- **Master FERNET_KEY in .env only** — never in DB, never in code
- **HTTPS everywhere** — Cloudflare handles TLS, no exceptions
- **Daraja callback IP whitelist** — only Safaricom's 12 IPs can hit `/api/mpesa/callback/*`
- **MikroTik API firewall** — router only accepts connections from HonestBill server IP
- **Rate limiting** — STK Push: 1/phone/30s. Payments: 3/MAC/hour. Portal: 10/IP/min
- **Idempotency** — `mpesa_receipt` is UNIQUE in DB. Duplicate callbacks = silent no-op
- **Amount validation** — callback amount verified against package price exactly
- **Separate JWT contexts** — platform admin and ISP admin tokens are distinct
- **Audit trail** — raw Daraja callbacks stored forever in `mpesa_callbacks`. Every session state change timestamped.
- **`.env` never committed** — in `.gitignore` from day one

---

## M-Pesa / Daraja Integration Design

```
INITIATE (your backend → Daraja):
POST https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest
{
  BusinessShortCode, Password, Timestamp,
  TransactionType: "CustomerPayBillOnline",
  Amount: package.price_ksh,
  PartyA: phone_number,
  PartyB: shortcode,
  PhoneNumber: phone_number,
  CallBackURL: "https://pay.honestbill.co.ke/api/mpesa/callback/{tenant_id}",
  AccountReference: session_id,
  TransactionDesc: package.name
}
→ Store CheckoutRequestID
→ Return 202 to portal, polling begins

CALLBACK (Safaricom → your backend):
POST /api/mpesa/callback/{tenant_id}
- Verify source IP is in SAFARICOM_IPS whitelist
- Log raw payload to mpesa_callbacks (always, even failures)
- If ResultCode == 0:
    Extract MpesaReceiptNumber (check UNIQUE — idempotency)
    Verify amount matches package price
    Record transaction with fee split
    Call MikroTik → add hotspot user
    Update session → ACTIVE
- If ResultCode != 0:
    Update session → FAILED
    Portal polling picks this up → shows failure message

PORTAL POLLING:
GET /api/sessions/{session_id}/status (every 3 seconds)
→ Returns: pending | active | failed
→ active → redirect to success screen
→ failed → show error, offer retry (new session, no double charge)
→ timeout at 90s → STK expired, prompt to try again
```

---

## MikroTik Integration Design

```
ISP ONE-TIME SETUP:
/ip hotspot set login-page=https://pay.honestbill.co.ke/portal/{slug}
(MikroTik appends: ?mac=...&ip=...&username=...)

Create API user on MikroTik with minimal permissions (read + hotspot write only)
Firewall: only allow port 8728 from HonestBill server IP

PYTHON (librouteros):
# Authorize after payment:
api('/ip/hotspot/user/add', name=phone, mac-address=mac,
    profile='default', comment=f'session:{session_id}',
    limit-uptime=f'{hours}h')

# Remove on expiry (APScheduler):
api('/ip/hotspot/active/remove', [find by MAC])
api('/ip/hotspot/user/remove', [find by comment containing session_id])
```

---

## Build Phases

### Phase 1 — MVP (Week 1) ← WE ARE HERE
**Goal:** One working end-to-end flow. Real M-Pesa. Real MikroTik. First ISP client live.

- [x] Project structure
- [x] Python 3.11 environment
- [x] Docker (Postgres + Redis)
- [x] config.py
- [x] database.py
- [x] crypto_service.py
- [x] All 9 models
- [x] Alembic initial migration (all tables in DB)
- [x] security.py
- [ ] main.py
- [ ] auth routes + JWT login
- [ ] network_checker.py
- [ ] mikrotik_service.py
- [ ] daraja_service.py
- [ ] session_service.py
- [ ] All API routes
- [ ] Captive portal HTML (5 screens)
- [ ] APScheduler jobs
- [ ] Seed script (1 tenant, packages, admin user)
- [ ] End-to-end test: phone → portal → M-Pesa → MikroTik → internet
- [ ] Deploy to Railway + Vercel
- [ ] First ISP client onboarded

### Phase 2 — Refinement (Week 2–3)
- SMS session reminders (Africa's Talking)
- Session renewal before expiry
- Voucher/code system
- ISP portal wizard integration (xbill-portal-wizard-v2.html)
- ISP custom branding: logo upload, color picker
- Public status page per ISP
- Better portal animations

### Phase 3 — Scale (Month 2)
- ISP self-service signup + onboarding wizard
- Automated weekly M-Pesa payouts to ISPs
- Multi-router per ISP
- Custom domain per ISP (portal.their-isp.co.ke)
- Analytics: revenue graphs, peak hours, churn
- ISP referral program

### Phase 4 — Expansion (Month 3+)
- PPPoE / fiber ISP support
- RADIUS integration (enterprise ISPs)
- Mobile app for ISP admins (React Native)
- Card payments (Pesapal/Flutterwave)
- Regional expansion (Uganda, Tanzania)
- White-label option for large ISPs
- Public API for ISP integrations

---

## Project Structure

```
D:\honestbill\
├── backend\
│   ├── app\
│   │   ├── api\
│   │   │   ├── __init__.py
│   │   │   └── routes\
│   │   │       ├── __init__.py
│   │   │       ├── auth.py          ← JWT login for admin + ISP
│   │   │       ├── portal.py        ← Captive portal HTML serving
│   │   │       ├── mpesa.py         ← STK Push + Daraja callback
│   │   │       ├── mikrotik.py      ← Router management endpoints
│   │   │       ├── sessions.py      ← Session status polling
│   │   │       ├── packages.py      ← Package CRUD
│   │   │       └── tenants.py       ← Tenant management
│   │   ├── core\
│   │   │   ├── config.py            ✓ DONE
│   │   │   ├── database.py          ✓ DONE
│   │   │   └── security.py          ✓ DONE
│   │   ├── models\
│   │   │   ├── tenant.py            ✓ DONE
│   │   │   ├── admin_user.py        ✓ DONE
│   │   │   ├── package.py           ✓ DONE
│   │   │   ├── session.py           ✓ DONE
│   │   │   ├── transaction.py       ✓ DONE
│   │   │   ├── network_event.py     ✓ DONE
│   │   │   ├── mpesa_config.py      ✓ DONE
│   │   │   ├── mikrotik_config.py   ✓ DONE
│   │   │   └── mpesa_callback.py    ✓ DONE
│   │   ├── services\
│   │   │   ├── crypto_service.py    ✓ DONE
│   │   │   ├── network_checker.py   ← NEXT
│   │   │   ├── mikrotik_service.py
│   │   │   ├── daraja_service.py
│   │   │   └── session_service.py
│   │   ├── jobs\
│   │   │   ├── network_poller.py
│   │   │   └── session_expiry.py
│   │   ├── templates\
│   │   │   ├── portal_base.html
│   │   │   ├── portal_packages.html
│   │   │   ├── portal_payment.html
│   │   │   ├── portal_waiting.html
│   │   │   └── portal_success.html
│   │   └── main.py
│   ├── tests\
│   ├── alembic\
│   ├── .env                         ✓ CREATED (never commit)
│   └── requirements.txt             ✓ FROZEN
├── frontend\                        ← Day 5 (Next.js)
├── docker-compose.yml               ✓ DONE
└── .gitignore                       ✓ DONE
```

---

## Environment Variables (.env)

```env
# Database
DATABASE_URL=postgresql+asyncpg://honestbill:honestbill_dev_secret@localhost:5432/honestbill
DATABASE_URL_SYNC=postgresql://honestbill:honestbill_dev_secret@localhost:5432/honestbill

# Security
SECRET_KEY=<generated with secrets.token_hex(32)>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Encryption
FERNET_KEY=<generated with Fernet.generate_key()>

# Daraja
DARAJA_ENV=sandbox  # switch to production for live

# App
APP_ENV=development
APP_HOST=0.0.0.0
APP_PORT=8000
```

---

## Key Design Decisions & Rationale

| Decision | Rationale |
|---|---|
| Python 3.11 (not 3.13) | asyncpg and psycopg2-binary don't have 3.13 wheels yet. 3.11 is stable and fully supported. |
| Monolith first, microservices later | Ship in a week. Split services when you know where the seams are. |
| APScheduler (not Kafka) | In-process scheduler is sufficient for MVP. Kafka adds complexity with no benefit at this scale. |
| Fernet for secrets | Simple, fast, symmetric encryption. Master key in env only. Standard for this use case. |
| Jinja2 for captive portal | Portal must load fast on any phone on any connection speed. No React, no CDN dependencies. |
| M-Pesa only (not Stripe/card) | This is Kenya. M-Pesa is the payment rail. 99% of target customers use it. |
| UNIQUE on mpesa_receipt | Safaricom can send duplicate callbacks. UNIQUE constraint is the last line of defense against double-charging. |
| tenant_id=NULL for platform admin | Clean way to distinguish platform owner from ISP admins in a single admin_users table. |
| Captive portal served by FastAPI | Keeps everything in one process for MVP. Portal is Jinja2 HTML. No separate static server needed. |

---

## What We Are NOT Building in Phase 1

- ISP self-service signup (manual onboarding only)
- Automated ISP payouts (manual this week)
- SMS notifications
- Multi-router per ISP
- Custom domains per ISP
- Analytics graphs
- Voucher system
- PPPoE/fiber support
- RADIUS
- Mobile app
- Card payments
- WhatsApp notifications

---

## Notes on First Test Client

- One insider ISP client onboarding at end of Week 1
- They will run real M-Pesa transactions through the system
- Chris has access to their MikroTik (or can walk them through setup)
- Daraja credentials: Chris has a live M-Pesa shortcode — sandbox first, switch to live for client onboard
- Goal: watch first real transaction go through and session activate on their router

---

## Current Build Status

**Session:** Day 1 — Foundation complete

**Completed:**
- Full project structure created
- Python 3.11 venv with all 66 packages installed
- Docker running (Postgres 16 + Redis 7)
- config.py — settings load from .env ✓
- database.py — async Postgres connection ✓
- crypto_service.py — Fernet encrypt/decrypt ✓
- All 9 SQLAlchemy models defined ✓
- Alembic initial migration — all tables in DB ✓
- security.py — JWT + bcrypt ✓

**Next up:**
- main.py (FastAPI app entry point)
- auth routes (login, get current user)
- network_checker.py
- mikrotik_service.py
- daraja_service.py
- session_service.py
- All API routes
- Captive portal HTML
- APScheduler jobs
- Seed script
- End-to-end test
