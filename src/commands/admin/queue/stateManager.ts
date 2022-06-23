import { OngoingQueueModel } from '../../../db';

async function getQueue(guildId: string) {
  return OngoingQueueModel.findOne({ where: { guildId } });
}

export async function tryToCreateQueue(guildId: string, interactionId: string, endDate: Date) {
  const existingQueue = await getQueue(guildId);
  if (existingQueue !== null) {
    return null;
  }
  return OngoingQueueModel.create({
    guildId,
    interactionId,
    endDate,
    queuedUsers: [],
  });
}

export async function addUserToQueue(guildId: string, userId: string) {
  const queue = await getQueue(guildId);
  if (queue === null) {
    return null;
  }
  if (!queue.queuedUsers.includes(userId)) {
    return false;
  }
  queue.queuedUsers.push(userId);
  await queue.save();
  return true;
}

export async function getNextUserOfQueue(guildId: string) {
  const queue = await getQueue(guildId);
  if (queue === null) {
    return null;
  }
  if (queue.queuedUsers.length === 0) {
    return null;
  }
  return queue.queuedUsers.shift();
}

export async function removeUserFromQueue(guildId: string, userId: string) {
  const queue = await getQueue(guildId);
  if (queue === null) {
    return null;
  }
  if (!queue.queuedUsers.includes(userId)) {
    return false;
  }
  queue.queuedUsers = queue.queuedUsers.filter((u) => u !== userId);
  await queue.save();
  return true;
}

export async function removeQueue(guildId: string) {
  const queue = await getQueue(guildId);
  if (queue === null) {
    return null;
  }
  await queue.remove();
  return true;
}

export async function removeOutdatedQueues() {
  const now = new Date();
  const queues = await OngoingQueueModel.find({
    where: { endDate: { lte: now } },
  });
  const deletedQueues = await OngoingQueueModel.deleteMany({
    where: { endDate: { lte: now } },
  });
  if (deletedQueues.acknowledged) {
    return queues;
  }
  return false;
}
