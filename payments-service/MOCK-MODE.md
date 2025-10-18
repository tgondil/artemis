# 🎭 Mock Mode Guide

Mock mode lets you demo the full FlowSync payment system without real Visa API calls.

## ✅ What's Currently Enabled

**Your `.env` has:**
```
VISA_MOCK_MODE=true
```

This means all Visa API calls are **simulated** with realistic responses!

---

## 🎯 What Mock Mode Does

### ✅ Simulates (Fake)
- PAAI responses (card validation)
- Visa Direct push/pull responses
- Transaction IDs (realistic but fake)
- Network delays (50-100ms for realism)

### ✅ Still Real
- Database operations
- All business logic
- Stake/refund calculations
- UI updates
- Transaction history

---

## 🎬 Try It Now!

1. **Create a user** → Name: "Alice", Card: "1111"
2. **Select Alice**
3. **Stake $100** → Creates real DB record
4. **Click "Earn $1"** → 
   - 🎭 Mock PAAI: "Card valid!"
   - 🎭 Mock Visa Direct: Generates fake TX ID like `VD1729291234ABC`
   - ✅ Real: Updates database, reduces stake balance
   - ✅ Real: Shows in transfers table
5. **Click "Earn $1" again** → Different TX ID each time!
6. **Settle to Pool** → Mock transfer to pool, closes stake

**Everything works end-to-end!** 🎉

---

## 📊 Example Mock Response

When you click "Earn $1", you'll see logs like:

```
🎭 MOCK MODE: Simulating PAAI response
✅ PAAI Response: { cardType: 'DEBIT', fastFundsIndicator: 'Y', ... }

🎭 MOCK MODE: Simulating Visa Direct push funds
Visa Transfer ID: VD1729291234XYZ5A8B9
Amount: $1.00
Status: SUCCESS
```

The transaction appears in your transfers table with this fake-but-realistic TX ID!

---

## 🔄 Switch to Real Visa API

When your Visa Developer project is approved and APIs are enabled:

**1. Edit `.env`:**
```bash
VISA_MOCK_MODE=false  # ← Change from true to false
```

**2. Restart server:**
```bash
pnpm dev
```

**3. Look for:**
```
✅ mTLS client initialized (Two-Way SSL enabled)
```

**4. Test!** Now it calls real Visa APIs!

---

## 🎨 What You Can Demo

### **Scenario 1: Full User Journey**
```
1. Alice stakes $100
2. Completes 5 focus sessions → Earns $5 back
3. Month ends → $95 settles to pool
4. Show transfers table → See all 6 transactions
```

### **Scenario 2: Multiple Users**
```
1. Create Alice (1111) and Bob (2222)
2. Both stake $100
3. Alice earns $10, Bob earns $30
4. Settle both → Pool grows to $160
```

### **Scenario 3: Transaction History**
```
1. Perform multiple transactions
2. Open transfers table
3. Show unique Visa TX IDs
4. Demonstrate audit trail
```

---

## 💡 Why Mock Mode?

**Benefits:**
- ✅ Demo without waiting for Visa approval
- ✅ Test full flow offline
- ✅ No API costs during development
- ✅ Faster iteration (no network delays)
- ✅ Predictable responses
- ✅ Safe testing environment

**Used by:**
- Netflix (API mocking)
- Uber (service simulation)
- Stripe (test mode)
- Every major tech company!

---

## 🔍 Technical Details

**Mock implementations:**
- `src/lib/visa-mock.ts` - Mock response generators
- `src/lib/visa-client.ts` - Checks `mockMode` flag
- Transaction IDs: `VD{timestamp}{random8chars}`
- Realistic delays: 50-100ms
- Proper response structure matching Visa docs

**Code example:**
```typescript
if (mockMode) {
  return {
    transactionIdentifier: `VD${Date.now()}${nanoid(8)}`,
    responseStatus: { status: 200, message: 'Success' },
    amount: payload.amount
  };
}
// else call real Visa API
```

---

## ✅ Current Status

```
Mode: 🎭 MOCK (Simulated)
PAAI: ✅ Mock responses
Visa Direct: ✅ Mock responses
Database: ✅ Real operations
UI: ✅ Fully functional

To switch to real Visa:
Set VISA_MOCK_MODE=false in .env
```

---

## 🎉 You're All Set!

Open http://localhost:3000 and try the full demo flow!

Everything will work perfectly with mock mode - you'll see realistic transaction IDs, proper status updates, and the complete user experience. The only difference is the Visa network calls are simulated. 🚀


