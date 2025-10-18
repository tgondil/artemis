# FlowSync X⁺ Payments Demo - Complete Setup Guide

## 📦 What's In This Repo

This repository contains a full-stack payments demo built with **Visa Developer APIs** (PAAI + Visa Direct). It demonstrates a gamified "Focus Bank" system where users can stake money, earn it back through micro-refunds, and settle remaining funds to a pool.

### Folder Structure

```
├── payments-service/          # Backend API (Node.js + Fastify)
│   ├── src/                   # Source code
│   │   ├── index.ts           # Main server entry point
│   │   ├── lib/               # Core utilities
│   │   │   ├── visa-client.ts    # Visa API integration
│   │   │   ├── visa-mock.ts      # Mock Visa responses
│   │   │   ├── xpay.ts           # X-Pay-Token authentication
│   │   │   └── config.ts         # Environment config
│   │   ├── routes/            # API endpoints
│   │   │   ├── payments.ts       # /api/payments/*
│   │   │   └── users.ts          # /api/users/*
│   │   └── services/          # Business logic
│   │       └── payment-service.ts
│   ├── prisma/                # Database
│   │   └── schema.prisma      # Data models
│   ├── certs/                 # Visa certificates (you provide)
│   │   ├── cert.pem           # Client certificate
│   │   └── key.pem            # Private key
│   ├── .env                   # Environment variables (create from env.example)
│   └── package.json           # Dependencies
│
└── payments-demo-ui/          # Frontend (React + Vite + Tailwind)
    ├── src/
    │   ├── App.tsx            # Main application component
    │   ├── components/
    │   │   └── FocusBank.tsx  # Glass sphere visualization
    │   ├── main.tsx           # React entry point
    │   └── index.css          # Global styles + animations
    ├── index.html             # HTML template
    └── package.json           # Dependencies
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React)                       │
│  - Glass sphere "Focus Bank" visualization              │
│  - User/stake management UI                             │
│  - Real-time transaction display                        │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP/JSON
                 ↓
┌─────────────────────────────────────────────────────────┐
│              Backend (Node.js + Fastify)                │
│  - REST API endpoints                                   │
│  - Prisma ORM + SQLite database                        │
│  - Payment flow orchestration                          │
└────────────────┬────────────────────────────────────────┘
                 │ X-Pay-Token + mTLS
                 ↓
┌─────────────────────────────────────────────────────────┐
│            Visa Developer Sandbox APIs                   │
│  - PAAI: Card attribute verification                    │
│  - Visa Direct: Push/pull funds                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **pnpm** (for backend) - Install: `npm install -g pnpm`
- **npm** (for frontend)
- **Visa Developer Account** (optional, mock mode works without it)

---

## 🔧 Backend Setup (`payments-service/`)

### Step 1: Install Dependencies

```bash
cd payments-service
pnpm install
```

### Step 2: Configure Environment Variables

Create `.env` from the example:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```bash
# === Visa API Configuration ===
VISA_API_KEY=your_visa_api_key_here
VISA_SHARED_SECRET=your_shared_secret_here  # Optional for mTLS-only
VISA_BASE_URL=https://sandbox.api.visa.com

# Certificate paths (for Two-Way SSL / mTLS)
VISA_CERT_PATH=./certs/cert.pem
VISA_KEY_PATH=./certs/key.pem

# Mock mode (use simulated Visa responses)
VISA_MOCK_MODE=true  # Set to false for real Visa API calls

# === Project Wallet Configuration ===
PROJECT_WALLET_PAN=4111111111111111  # Test card number
PROJECT_WALLET_LAST4=1111
PROJECT_RECIPIENT_NAME=FlowSync Pool
PROJECT_RECIPIENT_CITY=San Mateo
PROJECT_RECIPIENT_COUNTRY=USA

# === Database ===
DATABASE_URL=file:./dev.db

# === Server ===
PORT=3001
NODE_ENV=development
```

### Step 3: Setup Certificates (Optional - only needed if VISA_MOCK_MODE=false)

If using real Visa APIs, place your certificates in `certs/`:

```bash
mkdir -p certs
# Place your cert.pem and key.pem files here
```

**How to get certificates:**
1. Generate a CSR: Run `./certs/generate-csr.sh`
2. Submit CSR to Visa Developer Portal
3. Download cert.pem and key.pem
4. Place in `certs/` directory

See `certs/SETUP.md` for detailed instructions.

### Step 4: Initialize Database

```bash
pnpm db:push
```

This creates the SQLite database with the following tables:
- `User` - Demo users with test card numbers
- `Stake` - $100 stakes users create
- `Transfer` - All Visa Direct transactions (refunds + pool settlements)
- `Pool` - Global pool tracking unclaimed funds

### Step 5: Run Backend

```bash
pnpm dev
```

Backend will start on **http://localhost:3001**

**Expected output:**
```
🎭 MOCK MODE ENABLED - Using simulated Visa responses
   To use real Visa API, set VISA_MOCK_MODE=false in .env
Server listening at http://0.0.0.0:3001
```

---

## 🎨 Frontend Setup (`payments-demo-ui/`)

### Step 1: Install Dependencies

```bash
cd payments-demo-ui
npm install
```

### Step 2: Configure API URL (Optional)

The frontend is pre-configured to call the backend at `http://localhost:3001`. If you changed the backend port, update the API calls in `src/App.tsx`:

```typescript
const API_URL = 'http://localhost:3001/api';  // Change port if needed
```

### Step 3: Run Frontend

```bash
npm run dev
```

Frontend will start on **http://localhost:3000**

---

## 🎮 Using the Demo

### 1. Create a Demo User

- Click "Create Demo User"
- A user with a test Visa card will be created
- Example: Last 4 digits: `1234`, Name: `Alice Demo`

### 2. Create a Stake

- Select the user from dropdown
- Click "Stake $100.00"
- This creates an active stake (simulates user committing $100)

### 3. Earn FlowPoints (Micro-Refunds)

- The glass sphere "Focus Bank" appears
- Enter amount or use quick buttons ($1, $2, $5, $10)
- Click "Earn" → Triggers Visa Direct **push funds** to user's card
- Watch:
  - Coins drop into the sphere
  - Liquid fills up
  - Percentage increases
  - Transaction logs appear below

### 4. Settle to Pool

- When sphere reaches 100%, click "Settle & Start Fresh"
- Remaining funds are pulled to the project pool
- Uses Visa Direct **pull funds** API
- Stake is marked as settled

### 5. View Transactions

Scroll down to see:
- **Stakes Table**: All stakes (active/settled)
- **Transfers Table**: Every Visa Direct transaction with:
  - Transaction ID (e.g., `VD1760827854855...`)
  - Visa status codes
  - Timestamps

---

## 🔌 API Endpoints

### Users
- `GET /api/users` - List all users
- `POST /api/users` - Create demo user

### Stakes
- `POST /api/payments/stake` - Create $100 stake
- `GET /api/payments/stakes/:userId` - Get user's active stake
- `GET /api/payments/stakes` - List all stakes

### Transfers
- `POST /api/payments/refund` - Micro-refund to user (Visa Direct push)
- `POST /api/payments/settle-pool` - Settle remaining to pool (Visa Direct pull)
- `GET /api/payments/transfers/:userId` - Get user's transfers

### Pool
- `GET /api/payments/pool` - Get pool balance

---

## 🎭 Mock Mode vs Real Visa API

### Mock Mode (Default: `VISA_MOCK_MODE=true`)

**What it does:**
- Simulates Visa API responses locally
- No actual network calls to Visa
- Uses real Visa response schemas from documentation
- Adds 100-200ms delay to simulate network latency
- Perfect for development and demos

**When to use:**
- Local development
- Demos without internet
- Before Visa sandbox approval
- Testing edge cases

**Example mock response:**
```json
{
  "transactionIdentifier": "VD1760827854855MGL_GU-7",
  "actionCode": "00",
  "approvalCode": "BFSKPB",
  "responseStatus": {
    "status": 200,
    "code": "0000",
    "message": "Success"
  }
}
```

### Real Visa API Mode (`VISA_MOCK_MODE=false`)

**What it does:**
- Makes actual HTTPS calls to Visa Developer Sandbox
- Requires valid API keys and certificates
- Uses X-Pay-Token authentication + mTLS
- Returns real Visa transaction IDs

**Requirements:**
1. Visa Developer account
2. Project with PAAI + Visa Direct APIs enabled
3. API credentials (API key, shared secret)
4. Client certificates (cert.pem, key.pem)

**How to switch:**
1. Set `VISA_MOCK_MODE=false` in `.env`
2. Add your Visa credentials
3. Place certificates in `certs/`
4. Restart backend

---

## 🛠️ Database Schema

### User
```prisma
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  name            String
  testCardPAN     String    // Full PAN for Visa API
  testCardLast4   String    // Last 4 digits for display
  createdAt       DateTime  @default(now())
}
```

### Stake
```prisma
model Stake {
  id              String    @id @default(uuid())
  userId          String
  amountCents     Int       // Always 10000 ($100.00)
  refundedCents   Int       @default(0)
  isSettled       Boolean   @default(false)
  createdAt       DateTime  @default(now())
  settledAt       DateTime?
}
```

### Transfer
```prisma
model Transfer {
  id              String    @id @default(uuid())
  stakeId         String
  userId          String
  type            String    // "REFUND" or "POOL_SETTLE"
  amountCents     Int
  visaTxnId       String?   // Visa transaction identifier
  visaStatus      String?   // Visa response status
  createdAt       DateTime  @default(now())
}
```

### Pool
```prisma
model Pool {
  id              String    @id @default(uuid())
  totalCents      Int       @default(0)
  updatedAt       DateTime  @updatedAt
}
```

---

## 🔐 Security & Authentication

### Visa API Authentication

This demo implements **two layers** of Visa authentication:

1. **X-Pay-Token** (HMAC-SHA256)
   - Computed from: timestamp + resourcePath + query + body
   - Signed with shared secret
   - Format: `xv2:timestamp:hmac`
   - Sent in `X-Pay-Token` header

2. **Two-Way SSL (mTLS)**
   - Client certificate (`cert.pem`)
   - Private key (`key.pem`)
   - Mutual authentication between client and Visa

Implementation in `src/lib/visa-client.ts` and `src/lib/xpay.ts`.

---

## 🐛 Troubleshooting

### Backend won't start - Port 3001 already in use

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Frontend can't connect to backend

- Ensure backend is running on port 3001
- Check browser console for CORS errors
- Backend has CORS enabled for `http://localhost:3000`

### Database errors

```bash
# Regenerate Prisma client
pnpm db:generate

# Reset database (WARNING: deletes all data)
rm prisma/dev.db
pnpm db:push
```

### Visa API errors (when VISA_MOCK_MODE=false)

**404 errors:**
- Check that PAAI and Visa Direct APIs are enabled in your Visa Developer project
- Verify endpoint URLs in `.env`

**Authentication errors:**
- Verify `VISA_API_KEY` is correct
- Check `VISA_SHARED_SECRET` format
- Ensure certificates are valid and not expired

**Certificate errors:**
- Verify cert.pem and key.pem paths
- Check certificate format (should be PEM, not P12/PFX)
- See `certs/MACOS-SETUP.md` for macOS-specific help

---

## 📊 Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Fastify (high-performance HTTP server)
- **Database**: SQLite + Prisma ORM
- **APIs**: Axios (HTTP client for Visa)
- **Auth**: Custom X-Pay-Token + mTLS
- **Validation**: TypeScript

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Animations**: CSS animations + inline styles
- **UI Components**: Custom (no component library)

---

## 🧪 Testing

### Manual API Testing

```bash
# Create user
curl -X POST http://localhost:3001/api/users

# Create stake (replace USER_ID)
curl -X POST http://localhost:3001/api/payments/stake \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID"}'

# Trigger refund
curl -X POST http://localhost:3001/api/payments/refund \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","stakeId":"STAKE_ID","amount":2.00}'
```

### Automated Flow Test

```bash
cd payments-service
pnpm test
```

Runs `src/test-flow.ts` which:
1. Creates a user
2. Creates a stake
3. Executes 3 micro-refunds
4. Settles to pool
5. Verifies all transactions

---

## 📝 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VISA_API_KEY` | Yes | - | Your Visa API key from Developer Portal |
| `VISA_SHARED_SECRET` | No* | - | For X-Pay-Token auth (*not needed if using mTLS only) |
| `VISA_BASE_URL` | Yes | - | `https://sandbox.api.visa.com` |
| `VISA_CERT_PATH` | No* | - | Path to client certificate (*only if mTLS) |
| `VISA_KEY_PATH` | No* | - | Path to private key (*only if mTLS) |
| `VISA_MOCK_MODE` | No | `false` | `true` = use mock responses, `false` = real API |
| `PROJECT_WALLET_PAN` | Yes | - | Test card PAN for pool account |
| `PROJECT_WALLET_LAST4` | Yes | - | Last 4 digits of pool card |
| `PROJECT_RECIPIENT_NAME` | Yes | - | Name for pool transactions |
| `PROJECT_RECIPIENT_CITY` | Yes | - | City for pool transactions |
| `PROJECT_RECIPIENT_COUNTRY` | Yes | - | Country for pool transactions |
| `DATABASE_URL` | Yes | `file:./dev.db` | SQLite database location |
| `PORT` | No | `3001` | Backend server port |
| `NODE_ENV` | No | `development` | Environment mode |

---

## 🚀 Deployment Considerations

### For Production Use:

1. **Switch to production Visa credentials**
   - Apply for Visa production access
   - Complete PCI compliance requirements
   - Update `VISA_BASE_URL` to production endpoint

2. **Use PostgreSQL instead of SQLite**
   - Update `DATABASE_URL` in `.env`
   - Run `pnpm db:push` to migrate

3. **Environment Variables**
   - Use secrets management (AWS Secrets Manager, Vault, etc.)
   - Never commit `.env` to git

4. **HTTPS / SSL**
   - Frontend and backend should be served over HTTPS
   - Update CORS settings in backend

5. **Error Handling**
   - Add proper error logging (Sentry, LogRocket, etc.)
   - Implement retry logic for Visa API failures
   - Add rate limiting

6. **Compliance**
   - PCI-DSS for card data handling
   - KYC/AML if handling real money
   - Terms of Service and Privacy Policy

---

## 📚 Additional Resources

- **Visa Developer Portal**: https://developer.visa.com/
- **PAAI Documentation**: Search "Payment Account Attributes Inquiry" on Visa docs
- **Visa Direct Documentation**: Search "Visa Direct" on Visa docs
- **X-Pay-Token Guide**: Check Visa authentication documentation
- **Mock Mode Details**: See `payments-service/MOCK-MODE.md`
- **Certificate Setup**: See `payments-service/certs/SETUP.md`

---

## 🤝 Support

For questions or issues:
1. Check the troubleshooting section above
2. Review `QUICKSTART.md` and `PRESENTATION-GUIDE.md`
3. Check Visa Developer Portal for API status
4. Review backend logs for detailed error messages

---

## 📄 License

This is a demo application. Use at your own risk. Ensure compliance with Visa's terms of service and payment regulations in your jurisdiction.

---

## 🎉 Quick Commands Cheat Sheet

```bash
# Backend
cd payments-service
pnpm install              # Install dependencies
cp env.example .env       # Create environment file
pnpm db:push             # Setup database
pnpm dev                 # Start backend (port 3001)

# Frontend
cd payments-demo-ui
npm install              # Install dependencies
npm run dev              # Start frontend (port 3000)

# Kill all processes
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Database management
pnpm db:generate         # Regenerate Prisma client
pnpm db:studio          # Open Prisma Studio (database GUI)
```

---

**Ready to go!** Start both services and visit `http://localhost:3000` to see the demo in action. 🚀

