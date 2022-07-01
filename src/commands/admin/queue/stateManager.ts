import { OngoingQueue, OngoingQueueModel } from '../../../db';

async function getQueue(guildId: string) {
  return OngoingQueueModel.findOne({ where: { guildId } });
}

function getActiveUserOfQueue(queue: OngoingQueue) {
  return queue.queuedUsers.at(0) || null;
}

export async function tryToCreateQueue(
  guildId: string,
  channelId: string,
  messageId: string,
  topic: string,
) {
  const existingQueue = await getQueue(guildId);
  if (existingQueue !== null) {
    return null;
  }
  return OngoingQueueModel.create({
    guildId,
    channelId,
    messageId,
    topic,
    queuedUsers: [],
  });
}

export const maximumQueueLength = 100;

export async function addUserToQueue(
  guildId: string,
  userId: string,
): Promise<
  | null
  | { addedToQueue: false; position: number | null }
  | {
      addedToQueue: true;
      isActiveUser: boolean;
      position: number;
      topic: string;
      queuedUsers: Array<string>;
      activeUser: string | null;
    }
> {
  const queue = await getQueue(guildId);
  if (queue === null) {
    return null;
  }
  const indexOfUser = queue.queuedUsers.indexOf(userId);
  if (indexOfUser !== -1) {
    return { addedToQueue: false, position: indexOfUser + 1 };
  }
  // limit the length of queues
  if (queue.queuedUsers.length >= maximumQueueLength) {
    return { addedToQueue: false, position: null };
  }
  queue.queuedUsers.push(userId);
  await queue.save();
  const isActiveUser = queue.queuedUsers.length === 1;
  return {
    addedToQueue: true,
    isActiveUser,
    position: queue.queuedUsers.length,
    topic: queue.topic,
    queuedUsers: queue.queuedUsers,
    activeUser: getActiveUserOfQueue(queue),
  };
}

export async function goToNextUserOfQueue(guildId: string) {
  const queue = await getQueue(guildId);
  if (queue === null) {
    return null;
  }
  if (queue.queuedUsers.length <= 1) {
    return false;
  }
  queue.queuedUsers.shift();
  await queue.save();
  return {
    activeUser: getActiveUserOfQueue(queue),
    queuedUsers: queue.queuedUsers,
    topic: queue.topic,
  };
}

export async function removeUserFromQueue(guildId: string, userId: string) {
  const queue = await getQueue(guildId);
  if (queue === null) {
    return null;
  }
  if (!queue.queuedUsers.includes(userId)) {
    return false;
  }
  // can't leave queue if you're the only one left
  if (queue.queuedUsers.length === 1) {
    return false;
  }
  queue.queuedUsers = queue.queuedUsers.filter((u) => u !== userId);
  await queue.save();
  return {
    activeUser: getActiveUserOfQueue(queue),
    queuedUsers: queue.queuedUsers,
    topic: queue.topic,
  };
}

export async function removeQueue(guildId: string) {
  const queue = await getQueue(guildId);
  if (queue === null) {
    return null;
  }
  await queue.remove();
  return { topic: queue.topic, channelId: queue.channelId, messageId: queue.messageId };
}
