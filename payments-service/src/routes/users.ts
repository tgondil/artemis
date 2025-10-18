/**
 * User API Routes (demo purposes)
 */

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function usersRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/users
   * Create a demo user
   */
  fastify.post('/', async (request, reply) => {
    try {
      const { name, cardLast4 } = request.body as any;

      if (!name || !cardLast4) {
        return reply.code(400).send({
          error: 'Missing required fields: name, cardLast4',
        });
      }

      // Mask PAN (for demo, just create a masked version)
      const primaryPanMasked = `4111********${cardLast4}`;

      const user = await prisma.user.create({
        data: {
          name,
          primaryPanMasked,
          cardLast4,
        },
      });

      return reply.code(201).send(user);
    } catch (error: any) {
      console.error('Create user error:', error);
      return reply.code(500).send({
        error: 'Failed to create user',
      });
    }
  });

  /**
   * GET /api/users
   * List all demo users
   */
  fastify.get('/', async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return reply.send(users);
    } catch (error: any) {
      console.error('List users error:', error);
      return reply.code(500).send({
        error: 'Failed to fetch users',
      });
    }
  });

  /**
   * GET /api/users/:id
   * Get a specific user
   */
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          stakes: true,
          transfers: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return reply.send(user);
    } catch (error: any) {
      console.error('Get user error:', error);
      return reply.code(500).send({
        error: 'Failed to fetch user',
      });
    }
  });
}


