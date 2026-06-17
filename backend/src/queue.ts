import { Message, MessagePriority } from './domain';
import { pool } from './repositories/db';
import { listQueuedMessagesForWorker } from './repositories/messageRepository';

type QueueLogger = {
  info: (value: unknown) => void;
  warn: (value: unknown) => void;
  error: (value: unknown) => void;
};

type QueueJob = {
  messageId: string;
  clientId: string;
  conversationId: string;
  priority: MessagePriority;
  cost: number;
  content: string;
  conversationTitle: string;
};

export const messageCostMap: Record<MessagePriority, number> = {
  normal: 0.25,
  urgent: 0.5,
};

const pendingJobs: QueueJob[] = [];
let workerTimer: NodeJS.Timeout | null = null;
let workerRunning = false;

export const sortQueueMessages = (messages: Message[]) =>
  [...messages].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority === 'urgent' ? -1 : 1;
    }

    return new Date(left.queuedAt).getTime() - new Date(right.queuedAt).getTime();
  });

export const enqueueMessageJob = (job: QueueJob) => {
  pendingJobs.push(job);
};

export const getQueueSnapshot = () => ({
  pending: pendingJobs.length,
  jobs: [...pendingJobs],
});

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const updateMessageStatus = async (
  messageId: string,
  status: 'queued' | 'processing' | 'sent',
  processedAt: string | null,
) => {
  await pool.query(
    `UPDATE messages
     SET status = $2,
         processed_at = $3
     WHERE id = $1`,
    [messageId, status, processedAt],
  );
};

const processNextJob = async (logger: QueueLogger) => {
  if (workerRunning || pendingJobs.length === 0) {
    return;
  }

  workerRunning = true;
  const job = pendingJobs.shift();

  if (!job) {
    workerRunning = false;
    return;
  }

  try {
    logger.info({
      event: 'queue.job.received',
      messageId: job.messageId,
      clientId: job.clientId,
      conversationId: job.conversationId,
      priority: job.priority,
      cost: job.cost,
      content: job.content,
      pendingJobs: pendingJobs.length,
    });

    await updateMessageStatus(job.messageId, 'processing', null);
    logger.info({
      event: 'queue.job.processing',
      messageId: job.messageId,
      conversationId: job.conversationId,
      priority: job.priority,
    });

    await sleep(job.priority === 'urgent' ? 450 : 900);

    await updateMessageStatus(job.messageId, 'sent', new Date().toISOString());
    logger.info({
      event: 'queue.job.sent',
      messageId: job.messageId,
      conversationId: job.conversationId,
      priority: job.priority,
      remainingJobs: pendingJobs.length,
    });
  } catch (error) {
    logger.error({
      event: 'queue.job.failed',
      messageId: job.messageId,
      error,
    });

    await updateMessageStatus(job.messageId, 'queued', null);
    pendingJobs.unshift(job);
  } finally {
    workerRunning = false;
  }
};

export const startMessageWorker = (logger: QueueLogger) => {
  if (workerTimer) {
    return;
  }

  logger.info({ event: 'queue.worker.started' });

  workerTimer = setInterval(() => {
    void processNextJob(logger);
  }, 250);
};

export const bootstrapQueueFromDatabase = async (logger: QueueLogger) => {
  const queuedMessages = await listQueuedMessagesForWorker();

  for (const message of queuedMessages) {
    enqueueMessageJob({
      messageId: message.id,
      clientId: message.clientId,
      conversationId: message.conversationId,
      priority: message.priority,
      cost: message.cost,
      content: message.content,
      conversationTitle: message.conversationTitle,
    });
  }

  logger.info({
    event: 'queue.bootstrap.loaded',
    queuedMessages: queuedMessages.length,
  });
};

export const stopMessageWorker = () => {
  if (!workerTimer) {
    return;
  }

  clearInterval(workerTimer);
  workerTimer = null;
  workerRunning = false;
};
