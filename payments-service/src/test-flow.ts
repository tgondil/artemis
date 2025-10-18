/**
 * Test Flow Script
 * Demonstrates: Create User → Stake $100 → 3x Refunds → Settle Pool
 */

import { PrismaClient } from '@prisma/client';
import { PaymentService } from './services/payment-service.js';

const prisma = new PrismaClient();
const paymentService = new PaymentService();

async function testFlow() {
  console.log('\n🚀 FlowSync Payments Demo - Test Flow\n');
  console.log('═'.repeat(60));

  try {
    // Step 1: Create test user
    console.log('\n📝 Step 1: Creating test user...');
    const user = await prisma.user.create({
      data: {
        name: 'Alice Demo',
        primaryPanMasked: '4111********1111',
        cardLast4: '1111',
      },
    });
    console.log(`✅ User created: ${user.name} (ID: ${user.id})`);

    // Step 2: Create stake
    console.log('\n💰 Step 2: Creating $100 stake...');
    const stakeResult = await paymentService.createStake({
      userId: user.id,
      amount: 100,
      cardLast4: user.cardLast4,
    });
    console.log(`✅ Stake created: $${stakeResult.amount} (ID: ${stakeResult.stakeId})`);

    // Step 3: Three micro-refunds
    const refunds = [1, 1, 3];
    for (let i = 0; i < refunds.length; i++) {
      console.log(`\n🎁 Step 3.${i + 1}: Processing $${refunds[i]} refund...`);
      try {
        const refundResult = await paymentService.processRefund({
          userId: user.id,
          stakeId: stakeResult.stakeId,
          amount: refunds[i],
        });
        console.log(`✅ Refund processed: $${refundResult.amount}`);
        console.log(`   Visa Transfer ID: ${refundResult.visaTransferId}`);
        console.log(`   Status: ${refundResult.status}`);
        console.log(`   Remaining Balance: $${refundResult.remainingBalance}`);
      } catch (error: any) {
        console.error(`❌ Refund failed: ${error.message}`);
        console.log('   (This is expected in sandbox without proper certs)');
      }

      // Small delay between refunds
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 4: Settle remaining to pool
    console.log('\n🏊 Step 4: Settling remaining balance to pool...');
    try {
      const settleResult = await paymentService.settleToPool({
        stakeId: stakeResult.stakeId,
      });
      console.log(`✅ Pool settlement: $${settleResult.amount}`);
      console.log(`   Visa Transfer ID: ${settleResult.visaTransferId}`);
      console.log(`   Status: ${settleResult.status}`);
    } catch (error: any) {
      console.error(`❌ Pool settlement failed: ${error.message}`);
      console.log('   (This is expected in sandbox without proper certs)');
    }

    // Display final state
    console.log('\n📊 Final State:');
    console.log('═'.repeat(60));

    const finalStake = await prisma.stake.findUnique({
      where: { id: stakeResult.stakeId },
      include: { transfers: true },
    });
    console.log(`\nStake Status: ${finalStake?.status}`);
    console.log(`Total Staked: $${finalStake?.amountTotal}`);
    console.log(`Total Refunded: $${finalStake?.amountRefunded}`);
    console.log(`Remaining: $${(finalStake?.amountTotal || 0) - (finalStake?.amountRefunded || 0)}`);

    const pool = await prisma.pool.findFirst();
    console.log(`\nPool Total: $${pool?.amountTotal || 0}`);
    console.log(`Last Settlement: ${pool?.lastSettlementAt || 'N/A'}`);

    console.log(`\nTotal Transfers: ${finalStake?.transfers.length || 0}`);

    console.log('\n═'.repeat(60));
    console.log('✅ Test flow completed!\n');
    console.log('NOTE: Visa API calls may fail in sandbox without proper certificates.');
    console.log('      The ledger entries are created regardless.\n');

  } catch (error: any) {
    console.error('\n❌ Test flow error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run test flow
testFlow()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });


