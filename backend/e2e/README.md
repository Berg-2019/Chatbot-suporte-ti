# Helpdesk MSM - E2E Tests

Playwright-based end-to-end tests for the Helpdesk MSM system across all 3 sectors.

## Test Flows

### 1. TI Sector (`ti-ticket-flow.spec.ts`)
- Login as TI agent
- Create ticket with title, description, location
- Attach photo to ticket
- View ticket list filtered by TI sector
- PWA install prompt on mobile

### 2. ELECTRIC Sector (`electric-checklist-flow.spec.ts`)
- Login as ELECTRIC agent
- Fill NR-10 safety checklist
- Scan QR code to view asset details
- Create ELECTRIC ticket with equipment info
- Display NR-10 compliance warning

### 3. COMPRAS Sector (`compras-approve-flow.spec.ts`)
- Login as ADMIN_COMPRAS
- View pending purchase requests
- Approve a request
- Reject a request with reason
- **SSO cookie validation** (httpOnly, correct domain)

## Prerequisites

### Services Running
Tests expect these services accessible (via docker-compose.staging.yml or dev):

| Service | URL | Purpose |
|---------|-----|---------|
| Backend API | `http://api.helpdeskmsm.local` | Health check |
| TI Frontend | `http://ti.helpdeskmsm.local` | TI sector tests |
| ELECTRIC Frontend | `http://eletrica.helpdeskmsm.local` | ELECTRIC sector tests |
| COMPRAS Frontend | `http://compras.helpdeskmsm.local` | COMPRAS sector tests |

### Add to `/etc/hosts` for local testing:
```
127.0.0.1 ti.helpdeskmsm.local
127.0.0.1 eletrica.helpdeskmsm.local
127.0.0.1 compras.helpdeskmsm.local
127.0.0.1 api.helpdeskmsm.local
```

## Running Tests

### Install dependencies:
```bash
cd backend
npm install
npx playwright install chromium
```

### Run all tests:
```bash
npm run test:e2e
```

### Run with custom URLs (dev environment):
```bash
TI_URL=http://localhost:5173 \
ELECTRIC_URL=http://localhost:5174 \
COMPRAS_URL=http://localhost:5175 \
API_URL=http://localhost:3000 \
npm run test:e2e
```

### Run specific test file:
```bash
npx playwright test e2e/ti-ticket-flow.spec.ts
```

### Run with UI:
```bash
npx playwright test --ui
```

### Run in CI mode:
```bash
CI=true npm run test:e2e
```

## Test Credentials

Tests use these accounts (seeded via `prisma/seed.ts` or docker-compose):

| Sector | Email | Password | Role |
|--------|-------|----------|------|
| TI | `ti_agent@helpdesk.com` | `password123` | AGENT |
| ELECTRIC | `electric_agent@helpdesk.com` | `password123` | AGENT |
| COMPRAS | `admin_compras@helpdesk.com` | `password123` | ADMIN_COMPRAS |

## Architecture

```
e2e/
├── helpers/
│   └── auth.ts          # login/logout helpers
├── global-setup.ts      # Health check all services before tests
├── ti-ticket-flow.spec.ts
├── electric-checklist-flow.spec.ts
├── compras-approve-flow.spec.ts
└── README.md
```

## Troubleshooting

### "Service is DOWN" errors
Ensure all services are running:
```bash
docker compose -f ../docker-compose.staging.yml up -d
```

### SSO cookie tests failing
The httpOnly cookie is set on `.helpdeskmsm.local` domain. For local testing without proper domain:
1. Use `localhost` with different ports
2. Or ensure `/etc/hosts` entries are correct
3. Or set `COOKIE_DOMAIN=.helpdeskmsm.local` in backend `.env`

### Playwright browser not launching
```bash
npx playwright install chromium
```
