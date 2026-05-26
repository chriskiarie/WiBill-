# HonestBill Project Context

## Mission
Build a multi-tenant SaaS hotspot billing platform that lets independent ISPs in Kenya deploy branded captive portals, accept M-Pesa payments, and manage MikroTik hotspot access automatically. The platform owner runs the infrastructure; ISPs plug in; WiFi users pay. Core insight: network availability is a first-class citizen in billing decisions.

## Business Model
- **Platform Owner (Chris)**: Owns infrastructure, onboards ISPs, earns 10% of every transaction.
- **ISP (Tenant)**: Pays 10% commission per transaction, gets dashboard, branded portal, automated billing.
- **WiFi User**: Connects to hotspot, hits captive portal, picks package, pays M-Pesa, gets internet.

## Core Transaction Flow
1. User connects to ISP WiFi → MikroTik redirects to portal.
2. Portal checks ISP uplink status → shows packages if up, honest status if down.
3. User selects package, enters M-Pesa number → backend initiates Daraja STK Push.
4. User enters M-Pesa PIN → Safaricom calls callback URL.
5. Backend verifies callback → records transaction → calls MikroTik to add hotspot user.
6. APScheduler removes expired sessions from MikroTik every 60s.

## Three UI Surfaces
1. **Platform Super-Admin Dashboard**: See all ISPs, revenue, onboard ISPs.
2. **ISP Admin Dashboard**: Live transactions, active sessions, package management, revenue summary.
3. **Captive Portal**: Per-ISP branded, mobile-first, shows network status first.

## System Architecture
Layers: Client → API Gateway (FastAPI) → Core Services → Background Jobs (APScheduler) → Data Layer (PostgreSQL, Redis) → External APIs (Daraja, MikroTik) → Infrastructure (Railway, Vercel, Cloudflare, Docker).

## Tech Stack
- Backend: Python 3.11, FastAPI, SQLAlchemy async, Alembic
- Database: PostgreSQL 16, Redis
- Payments: M-Pesa Daraja API
- Router control: librouteros
- Encryption: Fernet (secrets at rest)
- Auth: JWT + bcrypt
- Portal templates: Jinja2
- Frontend: Next.js 14
- Hosting: Railway (backend), Vercel (frontend), Cloudflare (DNS/WAF)

## Database Schema (9 Tables)
tenants, admin_users, packages, sessions, transactions, network_events, mpesa_configs, mikrotik_configs, mpesa_callbacks.

## Security Architecture
- Fernet encryption at rest for MikroTik passwords and M-Pesa credentials.
- HTTPS everywhere via Cloudflare.
- Daraja callback IP whitelist (Safaricom IPs only).
- Rate limiting: STK Push 1/phone/30s, payments 3/MAC/hour, portal 10/IP/min.
- Idempotency via UNIQUE mpesa_receipt.
- Separate JWT contexts for platform and ISP admins.
- Audit trail: raw Daraja callbacks stored forever.

## Build Phases
**Phase 1 (MVP)**: Working end-to-end flow with real M-Pesa and MikroTik, first ISP client live.
**Phase 2**: SMS reminders, voucher system, portal wizard integration.
**Phase 3**: ISP self-service, automated payouts, multi-router, custom domains.
**Phase 4**: Expansion to Uganda/Tanzania, PPPoE/RADIUS, mobile app, card payments.

## Current Status (as of Day 1 Build Session)
- Backend foundation complete: config.py, database.py, crypto_service.py, all 9 models, Alembic initial migration, security.py.
- Next: main.py, auth routes, services (network_checker, mikrotik, daraja, session), API routes, captive portal HTML, APScheduler jobs, seed script, end-to-end test, deployment.
- Frontend: Next.js app structure in place, some dashboard pages created.
- Environment: Docker running (Postgres 16 + Redis 7), .env created (not committed).