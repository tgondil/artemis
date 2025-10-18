/**
 * FlowSync Payments Service
 * Entry point for the Fastify server
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { appConfig } from './lib/config.js';
import { paymentsRoutes } from './routes/payments.js';
import { usersRoutes } from './routes/users.js';

const fastify = Fastify({
  logger: {
    level: appConfig.server.nodeEnv === 'production' ? 'info' : 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// CORS
await fastify.register(cors, {
  origin: true, // Allow all origins in dev
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Routes
fastify.register(paymentsRoutes, { prefix: '/api/payments' });
fastify.register(usersRoutes, { prefix: '/api/users' });

// Start server
const start = async () => {
  try {
    const port = appConfig.server.port;
    await fastify.listen({ port, host: '0.0.0.0' });
    
    console.log(`\n🚀 FlowSync Payments Service running at http://localhost:${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
    console.log(`🔒 Visa API Mode: ${appConfig.visa.baseURL}\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();


