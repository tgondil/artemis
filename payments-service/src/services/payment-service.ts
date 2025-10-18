/**
 * Payment Service - Business logic for stake/refund/settle operations
 */

import { PrismaClient } from '@prisma/client';
import { VisaClient } from '../lib/visa-client.js';
import { appConfig } from '../lib/config.js';
import { buildPAAIPayload, buildPushFundsPayload, buildPullFundsPayload } from '../lib/visa-payloads.js';

const prisma = new PrismaClient();

export class PaymentService {
  private visaClient: VisaClient;

  constructor() {
    this.visaClient = new VisaClient({
      apiKey: appConfig.visa.apiKey,
      sharedSecret: appConfig.visa.sharedSecret,
      baseURL: appConfig.visa.baseURL,
      certPath: appConfig.visa.certPath,
      keyPath: appConfig.visa.keyPath,
      mockMode: appConfig.visa.mockMode,
    });
  }

  /**
   * Creates a stake - user commits funds to project wallet
   * Optional: can include actual pull from user card (simulated for now)
   */
  async createStake(params: {
    userId: string;
    amount: number;
    cardLast4: string;
  }) {
    const { userId, amount, cardLast4 } = params;

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has an active stake
    const activeStake = await prisma.stake.findFirst({
      where: {
        userId,
        status: 'HELD',
      },
    });

    if (activeStake) {
      throw new Error('You already have an active stake. Please settle it before creating a new one.');
    }

    // Create stake record
    const stake = await prisma.stake.create({
      data: {
        userId,
        amountTotal: amount,
        amountRefunded: 0,
        status: 'HELD',
      },
    });

    // Optional: Pull funds from user card to project wallet (simulated)
    // In sandbox, we skip actual pull or use test scenario
    // For demo purposes, we just create the ledger entry

    return {
      stakeId: stake.id,
      status: stake.status,
      amount: stake.amountTotal,
      createdAt: stake.createdAt,
    };
  }

  /**
   * Processes a micro-refund - push funds back to user card
   * Flow: PAAI check → Visa Direct push → Update ledger
   */
  async processRefund(params: {
    userId: string;
    stakeId: string;
    amount: number;
  }) {
    const { userId, stakeId, amount } = params;

    // Verify stake exists and has available balance
    const stake = await prisma.stake.findUnique({ where: { id: stakeId } });
    if (!stake) {
      throw new Error('Stake not found');
    }
    if (stake.status !== 'HELD') {
      throw new Error('Stake is not active');
    }
    const availableBalance = stake.amountTotal - stake.amountRefunded;
    if (amount > availableBalance) {
      throw new Error(`Insufficient stake balance. Available: ${availableBalance}`);
    }

    // Get user card info
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Extract PAN from masked (for demo, use test PAN)
    // In production, you'd retrieve from secure token vault
    const recipientPAN = this.extractPANFromUser(user);

    // Step 1: PAAI - Check recipient account attributes (optional in sandbox)
    console.log('Calling PAAI for recipient:', user.cardLast4);
    let paaiResponse;
    try {
      const paaiPayload = buildPAAIPayload(recipientPAN);
      paaiResponse = await this.visaClient.paai(paaiPayload);
      console.log('✅ PAAI Response:', JSON.stringify(paaiResponse, null, 2));
    } catch (error: any) {
      console.warn('⚠️  PAAI failed (this is OK in sandbox):', error.response?.data || error.message);
      console.log('   Proceeding with Visa Direct anyway...');
      // In production, you'd validate the error and decide whether to proceed
      // For demo/sandbox, we'll continue without PAAI pre-check
    }

    // Step 2: Push funds via Visa Direct
    console.log('Calling Visa Direct push for amount:', amount);
    let pushResponse;
    try {
      const pushPayload = buildPushFundsPayload({
        senderPAN: appConfig.projectWallet.pan,
        senderExpiry: appConfig.projectWallet.expiry,
        recipientPAN,
        amount,
      });
      pushResponse = await this.visaClient.pushFunds(pushPayload);
      console.log('Push Funds Response:', JSON.stringify(pushResponse, null, 2));
    } catch (error: any) {
      console.error('Push funds failed:', error.response?.data || error.message);
      throw new Error('Fund transfer failed');
    }

    // Step 3: Update ledger
    const transfer = await prisma.transfer.create({
      data: {
        userId,
        stakeId,
        direction: 'PUSH',
        amount,
        visaStatus: pushResponse?.responseStatus?.message || pushResponse?.actionCode || 'COMPLETED',
        visaTransferId: pushResponse?.transactionIdentifier || 'N/A',
        metadata: JSON.stringify(pushResponse),
      },
    });

    await prisma.stake.update({
      where: { id: stakeId },
      data: {
        amountRefunded: stake.amountRefunded + amount,
      },
    });

    return {
      transferId: transfer.id,
      visaTransferId: transfer.visaTransferId,
      amount: transfer.amount,
      status: transfer.visaStatus,
      remainingBalance: availableBalance - amount,
    };
  }

  /**
   * Settles remaining stake balance to Focus Pool
   */
  async settleToPool(params: { stakeId: string }) {
    const { stakeId } = params;

    // Verify stake
    const stake = await prisma.stake.findUnique({ where: { id: stakeId } });
    if (!stake) {
      throw new Error('Stake not found');
    }
    if (stake.status !== 'HELD') {
      throw new Error('Stake already closed');
    }

    const remainingBalance = stake.amountTotal - stake.amountRefunded;
    if (remainingBalance <= 0) {
      throw new Error('No remaining balance to settle');
    }

    // Push remaining balance to pool account
    console.log('Settling to pool:', remainingBalance);
    let pushResponse;
    try {
      const pushPayload = buildPushFundsPayload({
        senderPAN: appConfig.projectWallet.pan,
        senderExpiry: appConfig.projectWallet.expiry,
        recipientPAN: appConfig.poolAccount.pan,
        amount: remainingBalance,
      });
      pushResponse = await this.visaClient.pushFunds(pushPayload);
      console.log('Pool Settlement Response:', JSON.stringify(pushResponse, null, 2));
    } catch (error: any) {
      console.error('Pool settlement failed:', error.response?.data || error.message);
      throw new Error('Pool settlement failed');
    }

    // Create transfer record
    const transfer = await prisma.transfer.create({
      data: {
        userId: stake.userId,
        stakeId,
        direction: 'PUSH',
        amount: remainingBalance,
        visaStatus: pushResponse?.responseStatus?.message || pushResponse?.actionCode || 'COMPLETED',
        visaTransferId: pushResponse?.transactionIdentifier || 'N/A',
        metadata: JSON.stringify(pushResponse),
      },
    });

    // Update stake status
    await prisma.stake.update({
      where: { id: stakeId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
      },
    });

    // Update pool balance
    const pool = await this.getOrCreatePool();
    await prisma.pool.update({
      where: { id: pool.id },
      data: {
        amountTotal: pool.amountTotal + remainingBalance,
        lastSettlementAt: new Date(),
      },
    });

    return {
      poolTransferId: transfer.id,
      visaTransferId: transfer.visaTransferId,
      amount: remainingBalance,
      status: transfer.visaStatus,
    };
  }

  /**
   * Helper: Get or create the pool record
   */
  private async getOrCreatePool() {
    let pool = await prisma.pool.findFirst();
    if (!pool) {
      pool = await prisma.pool.create({
        data: { amountTotal: 0 },
      });
    }
    return pool;
  }

  /**
   * Helper: Extract PAN from user (demo mode - uses test PANs)
   * In production, this would retrieve from secure token vault
   */
  private extractPANFromUser(user: any): string {
    // For demo: Use test PAN based on last4
    // In sandbox, use Visa test PANs like 4111111111111111
    return '4111111111111111'; // Default Visa test PAN
  }
}

