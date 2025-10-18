/**
 * Payment API Routes
 */

import { FastifyInstance } from 'fastify';
import { PaymentService } from '../services/payment-service.js';
import { PrismaClient } from '@prisma/client';

const paymentService = new PaymentService();
const prisma = new PrismaClient();

export async function paymentsRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/payments/stake
   * Create a new stake
   */
  fastify.post('/stake', async (request, reply) => {
    try {
      const { userId, amount, cardLast4 } = request.body as any;

      if (!userId || !amount || !cardLast4) {
        return reply.code(400).send({
          error: 'Missing required fields: userId, amount, cardLast4',
        });
      }

      const result = await paymentService.createStake({
        userId,
        amount: parseFloat(amount),
        cardLast4,
      });

      return reply.code(201).send(result);
    } catch (error: any) {
      console.error('Stake error:', error);
      return reply.code(500).send({
        error: error.message || 'Failed to create stake',
      });
    }
  });

  /**
   * POST /api/payments/refund
   * Process a micro-refund (PAAI + Visa Direct push)
   */
  fastify.post('/refund', async (request, reply) => {
    try {
      const { userId, stakeId, amount } = request.body as any;

      if (!userId || !stakeId || !amount) {
        return reply.code(400).send({
          error: 'Missing required fields: userId, stakeId, amount',
        });
      }

      const result = await paymentService.processRefund({
        userId,
        stakeId,
        amount: parseFloat(amount),
      });

      return reply.code(200).send(result);
    } catch (error: any) {
      console.error('Refund error:', error);
      return reply.code(500).send({
        error: error.message || 'Failed to process refund',
      });
    }
  });

  /**
   * POST /api/payments/settle-pool
   * Settle remaining stake balance to Focus Pool
   */
  fastify.post('/settle-pool', async (request, reply) => {
    try {
      const { stakeId } = request.body as any;

      if (!stakeId) {
        return reply.code(400).send({
          error: 'Missing required field: stakeId',
        });
      }

      const result = await paymentService.settleToPool({ stakeId });

      return reply.code(200).send(result);
    } catch (error: any) {
      console.error('Settle pool error:', error);
      return reply.code(500).send({
        error: error.message || 'Failed to settle to pool',
      });
    }
  });

  /**
   * GET /api/payments/stakes/:userId
   * Get all stakes for a user
   */
  fastify.get('/stakes/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any;

      const stakes = await prisma.stake.findMany({
        where: { userId },
        include: {
          transfers: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(stakes);
    } catch (error: any) {
      console.error('Get stakes error:', error);
      return reply.code(500).send({
        error: 'Failed to fetch stakes',
      });
    }
  });

  /**
   * GET /api/payments/transfers/:userId
   * Get all transfers for a user
   */
  fastify.get('/transfers/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as any;

      const transfers = await prisma.transfer.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(transfers);
    } catch (error: any) {
      console.error('Get transfers error:', error);
      return reply.code(500).send({
        error: 'Failed to fetch transfers',
      });
    }
  });

  /**
   * GET /api/payments/pool
   * Get pool status
   */
  fastify.get('/pool', async (request, reply) => {
    try {
      const pool = await prisma.pool.findFirst();
      return reply.send(pool || { amountTotal: 0 });
    } catch (error: any) {
      console.error('Get pool error:', error);
      return reply.code(500).send({
        error: 'Failed to fetch pool status',
      });
    }
  });
}


