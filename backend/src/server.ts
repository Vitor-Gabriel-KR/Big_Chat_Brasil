import Fastify from 'fastify';
import { env, pool } from './repositories/db';
import { ensureBusinessSchema } from './repositories/migrations';
import { seedDevelopmentData } from './repositories/seed';
import { registerAuthRoutes } from './controllers/authController';
import { registerBillingRoutes } from './controllers/billingController';
import { registerClientRoutes } from './controllers/clientController';
import { registerConversationRoutes } from './controllers/conversationController';
import { registerDashboardRoutes } from './controllers/dashboardController';
import { registerDocsRoutes } from './controllers/docsController';
import { registerFinanceRoutes } from './controllers/financeController';
import { registerMessageRoutes } from './controllers/messageController';
import { startMessageWorker, stopMessageWorker, getQueueSnapshot, bootstrapQueueFromDatabase } from './queue';

const app = Fastify({
  logger: true,
});

app.get('/health', async () => {
  const result = await pool.query('SELECT NOW() AS now');

  return {
    status: 'ok',
    database: 'connected',
    timestamp: result.rows[0].now,
  };
});

app.get('/queue/status', async () => ({
  status: 'ok',
  queue: getQueueSnapshot(),
}));

const start = async () => {
  try {
    await ensureBusinessSchema();
    await seedDevelopmentData();
    await bootstrapQueueFromDatabase(app.log);
    startMessageWorker(app.log);
    await app.register(registerAuthRoutes);
    await app.register(registerClientRoutes);
    await app.register(registerBillingRoutes);
    await app.register(registerConversationRoutes, { prefix: '/api' });
    await app.register(registerDashboardRoutes);
    await app.register(registerDocsRoutes);
    await app.register(registerFinanceRoutes);
    await app.register(registerMessageRoutes);
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (error) {
    app.log.error(error);
    await pool.end();
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  stopMessageWorker();
  await app.close();
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  stopMessageWorker();
  await app.close();
  await pool.end();
  process.exit(0);
});

start();
