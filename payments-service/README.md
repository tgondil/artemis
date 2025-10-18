# FlowSync X⁺ Payments Service

Visa Developer Sandbox integration for **stake → micro-refund → pool settle** demo.

## Architecture

```
┌─────────────────┐
│  React UI       │  (payments-demo-ui)
│  (Port 3000)    │
└────────┬────────┘
         │ REST API
         ▼
┌─────────────────┐
│  Fastify API    │  (payments-service)
│  (Port 3001)    │
└────────┬────────┘
         │
    ┌────┴─────┬─────────────┐
    ▼          ▼             ▼
┌────────┐ ┌────────┐  ┌──────────┐
│ Prisma │ │ X-Pay  │  │  mTLS    │
│   DB   │ │ Client │  │  Client  │
└────────┘ └───┬────┘  └────┬─────┘
               │            │
               └─────┬──────┘
                     ▼
            ┌─────────────────┐
            │ Visa Developer  │
            │    Sandbox      │
            └─────────────────┘
```

## Setup

### 1. Prerequisites

- Node.js 18+ & pnpm
- Visa Developer account ([sign up](https://developer.visa.com))

### 2. Create Visa Developer Project

1. Log in to [Visa Developer Portal](https://developer.visa.com)
2. Create a new project:
   - Select **PAAI** and **Visa Direct** APIs
   - Generate credentials → Download **cert.pem** & **key.pem**
   - Note your **API Key** and **Shared Secret**

### 3. Configure Environment

```bash
cd payments-service
cp env.example .env
```

Edit `.env` with your credentials:

```bash
VISA_API_KEY=your_api_key_here
VISA_SHARED_SECRET=your_shared_secret_here
VISA_BASE_URL=https://sandbox.api.visa.com

# Place your downloaded certs in ./certs/
VISA_CERT_PATH=./certs/cert.pem
VISA_KEY_PATH=./certs/key.pem

# Test PANs (use Visa sandbox test cards)
PROJECT_WALLET_PAN=4111111111111111
PROJECT_WALLET_EXPIRY=2025-12
POOL_ACCOUNT_PAN=4222222222222222
POOL_ACCOUNT_EXPIRY=2026-12
```

Create `certs/` directory and copy your Visa certificates:

```bash
mkdir -p certs
# Copy your cert.pem and key.pem here
```

### 4. Install Dependencies

```bash
pnpm install
```

### 5. Initialize Database

```bash
pnpm db:push
```

### 6. Run Backend

```bash
pnpm dev
```

Server runs at: `http://localhost:3001`

### 7. Run Frontend

In a separate terminal:

```bash
cd ../payments-demo-ui
pnpm install
pnpm dev
```

UI runs at: `http://localhost:3000`

## API Endpoints

### Users

- `POST /api/users` - Create demo user
  ```json
  { "name": "Alice", "cardLast4": "1111" }
  ```

- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user details

### Payments

- `POST /api/payments/stake` - Create stake
  ```json
  { "userId": "...", "amount": 100, "cardLast4": "1111" }
  ```

- `POST /api/payments/refund` - Process micro-refund (PAAI + Visa Direct)
  ```json
  { "userId": "...", "stakeId": "...", "amount": 1 }
  ```

- `POST /api/payments/settle-pool` - Settle to pool
  ```json
  { "stakeId": "..." }
  ```

- `GET /api/payments/stakes/:userId` - Get user stakes
- `GET /api/payments/transfers/:userId` - Get user transfers
- `GET /api/payments/pool` - Get pool status

## Test Script

Run the automated test flow:

```bash
pnpm test
```

This creates a user, stakes $100, processes 3 refunds ($1, $1, $3), and settles remaining balance to pool.

## Key Features

### 1. X-Pay-Token Authentication

PAAI calls use HMAC-SHA256 header authentication:

```typescript
// src/lib/xpay.ts
const preHash = timestamp + resourcePath + queryString + requestBody;
const hmac = crypto.createHmac('sha256', sharedSecret).update(preHash).digest('hex');
const xPayToken = `xv2:${timestamp}:${hmac}`;
```

### 2. Two-Way SSL (mTLS)

Visa Direct calls use client certificates:

```typescript
// src/lib/visa-client.ts
const httpsAgent = new https.Agent({
  cert: fs.readFileSync(certPath),
  key: fs.readFileSync(keyPath),
  rejectUnauthorized: true,
});
```

### 3. Payment Flow

**Refund sequence:**

1. **PAAI** - Validate recipient account attributes
2. **Visa Direct pushfunds** - Transfer funds
3. **Update ledger** - Record transaction

```typescript
// src/services/payment-service.ts
const paaiResponse = await visaClient.paai(buildPAAIPayload(recipientPAN));
const pushResponse = await visaClient.pushFunds(buildPushFundsPayload({...}));
await prisma.transfer.create({...});
```

## Database Schema

```prisma
model User {
  id              String
  name            String
  primaryPanMasked String  // "4111********1111"
  cardLast4       String
  stakes          Stake[]
  transfers       Transfer[]
}

model Stake {
  id              String
  userId          String
  amountTotal     Float
  amountRefunded  Float
  status          String  // HELD | CLOSED
  transfers       Transfer[]
}

model Transfer {
  id              String
  direction       String  // PUSH | PULL
  amount          Float
  visaStatus      String?
  visaTransferId  String?
  metadata        String? // JSON
}

model Pool {
  amountTotal       Float
  lastSettlementAt  DateTime?
}
```

## Demo Flow (2 minutes)

1. Open UI → Create user "Alice" with card ending in 1111
2. Select Alice → Click **Stake $100**
3. Click **Earn $1** (triggers PAAI + pushfunds)
4. Repeat 2-3 more times
5. Click **Settle to Pool** → closes stake, pushes remainder to pool
6. View transfers table with Visa transaction IDs

## Sandbox Limitations

- **VTS (Tokenization)** requires special access - we use test PANs directly
- **mTLS** may require additional Visa approval for certain APIs
- **Regional restrictions** may apply to certain endpoints
- Test PANs from [Visa Testing Guide](https://developer.visa.com/capabilities/visa_direct/docs-test-data)

## Visa API References

- [Quick Start Guide](https://developer.visa.com/pages/working-with-visa-apis/visa-developer-quick-start-guide)
- [X-Pay-Token Auth](https://developer.visa.com/pages/working-with-visa-apis/x-pay-token)
- [Visa Direct API](https://developer.visa.com/capabilities/visa_direct/docs-how-to)
- [PAAI API](https://developer.visa.com/capabilities/paai)
- [Test Data](https://developer.visa.com/capabilities/visa_direct/docs-test-data)

## Troubleshooting

### "PAAI failed: 401"

- Verify `VISA_API_KEY` and `VISA_SHARED_SECRET` are correct
- Check X-Pay-Token header generation (timestamp, hash)

### "Push Funds failed: Certificate error"

- Ensure `cert.pem` and `key.pem` are valid and readable
- Check cert expiry date
- Verify mTLS is enabled for your project in Visa Developer Portal

### "Insufficient stake balance"

- Check stake status (must be `HELD`, not `CLOSED`)
- Verify `amountTotal - amountRefunded >= refundAmount`

## Production Considerations

**NOT included in this demo:**

- Real focus detection (camera/AI)
- KYC/AML compliance
- PCI DSS compliance (never store full PAN/CVV)
- VTS provisioning (token vault)
- Parental controls UI
- Production Visa onboarding
- Idempotency keys
- Rate limiting
- Proper error handling & retries
- Audit logging
- Multi-region support

## License

MIT (Demo purposes only)

