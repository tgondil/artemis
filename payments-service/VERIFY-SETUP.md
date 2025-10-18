# Verify Your Setup

Quick checklist to ensure everything is configured correctly before starting the server.

## ✅ Checklist

### 1. Environment Variables

Check your `.env` file:

```bash
cd /Users/devanshkhandelwal/Documents/fall2025/artemis/payments-service
cat .env
```

**Required:**
- ✅ `VISA_API_KEY` - Your API key from Visa Developer Portal
- ✅ `VISA_BASE_URL` - Should be `https://sandbox.api.visa.com`
- ✅ `VISA_CERT_PATH` - Path to cert.pem (e.g., `./certs/cert.pem`)
- ✅ `VISA_KEY_PATH` - Path to key.pem (e.g., `./certs/key.pem`)

**Optional:**
- `VISA_SHARED_SECRET` - Only needed if your project uses X-Pay-Token auth (can be blank for mTLS-only)

### 2. Certificate Files

Verify certificates are in place:

```bash
ls -la certs/
```

Should show:
- ✅ `cert.pem` (certificate)
- ✅ `key.pem` (private key)

**Verify they're valid:**

```bash
# Check certificate
openssl x509 -in certs/cert.pem -text -noout | head -n 10

# Check private key
openssl rsa -in certs/key.pem -check -noout
```

Both should succeed without errors.

**Check they match:**

```bash
openssl x509 -noout -modulus -in certs/cert.pem | openssl md5
openssl rsa -noout -modulus -in certs/key.pem | openssl md5
```

The two MD5 hashes should be **identical**.

### 3. Test PANs

Your `.env` should have valid test PANs:

```
PROJECT_WALLET_PAN=4111111111111111
PROJECT_WALLET_EXPIRY=2025-12
POOL_ACCOUNT_PAN=4222222222222222
POOL_ACCOUNT_EXPIRY=2026-12
```

### 4. Dependencies

Install if not already done:

```bash
pnpm install
```

### 5. Database

Initialize the database:

```bash
pnpm db:push
```

Expected output: `✔ Generated Prisma Client`

---

## 🚀 Start the Server

```bash
pnpm dev
```

**Expected output:**

```
✅ mTLS client initialized (Two-Way SSL enabled)
🚀 FlowSync Payments Service running at http://localhost:3001
📊 Health check: http://localhost:3001/health
🔒 Visa API Mode: https://sandbox.api.visa.com
```

### Authentication Mode

Look for one of these messages:

- `✅ mTLS client initialized (Two-Way SSL enabled)` → **Perfect!** You're using mTLS
- `⚠️  mTLS client creation failed, falling back to X-Pay-Token` → Will use X-Pay-Token (requires shared secret)

---

## 🧪 Test the API

### Health Check

```bash
curl http://localhost:3001/health
```

Expected: `{"status":"ok","timestamp":"..."}`

### Create a Test User

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","cardLast4":"1111"}'
```

Expected: User object with ID

### List Users

```bash
curl http://localhost:3001/api/users
```

Expected: Array of users

---

## 🔍 Troubleshooting

### "Missing required environment variable: VISA_API_KEY"

Edit `.env` and add your API key from Visa Developer Portal.

### "Cannot read certificates"

Check:
1. Files exist: `ls certs/cert.pem certs/key.pem`
2. Paths in `.env` are correct: `VISA_CERT_PATH=./certs/cert.pem`
3. Permissions: `chmod 600 certs/key.pem && chmod 644 certs/cert.pem`

### "mTLS client creation failed"

This is OK if you see it! The app will fall back to X-Pay-Token authentication. However, if you want mTLS:

1. Verify cert and key files are valid (see step 2 above)
2. Make sure they match (see "Check they match" above)
3. Ensure cert is from the correct Visa project

### "Port 3001 already in use"

Kill the existing process:

```bash
lsof -ti:3001 | xargs kill -9
```

---

## ✅ All Set!

If the server starts successfully and you see the mTLS initialization message, you're ready to go!

Next: Open http://localhost:3000 (frontend) and start testing! 🎉


