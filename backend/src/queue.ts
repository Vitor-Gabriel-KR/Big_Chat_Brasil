import { Message, MessagePriority } from './domain';

export const messageCostMap: Record<MessagePriority, number> = {
  normal: 0.25,
  urgent: 0.5,
};

export const sortQueueMessages = (messages: Message[]) =>
  [...messages].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority === 'urgent' ? -1 : 1;
    }

    return new Date(left.queuedAt).getTime() - new Date(right.queuedAt).getTime();
  });

