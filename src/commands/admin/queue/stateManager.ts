import { OngoingQueue, OngoingQueueModel } from '../../../db';

async function getQueue(guildId: string) {
  return OngoingQueueModel.findOne({ where: { guildId } });
}

function getActiveUserOfQueue(queue: OngoingQueue) {
  return queue.queuedUsers.at(0) || null;
}

// let's see if we can work without this
/* export async function getQueueData(guildId:string) {
  const queue = await getQueue(guildId);
  if (!queue) {
    return null;
  }
  return queue.toObject();
} */

export async function tryToCreateQueue(
  guildId: string,
  topic: string,
) {
  const existingQueue = await getQueue(guildId);
  if (existingQueue !== null) {
    return null;
  }
  return OngoingQueueModel.create({
    guildId,
    topic,
    queuedUsers: [],
  });
}

export async function addUserToQueue(guildId: string, userId: string) {
  const queue = await getQueue(guildId);
  if (queue === null) {
    return null;
  }
  const indexOfUser = queue.queuedUsers.indexOf(userId);
  if (indexOfUser !== -1) {
    return { addedToQueue: false, position: indexOfUser + 1 };
  }
  queue.queuedUsers.push(userId);
  await queue.save();
  const isActiveUser = queue.queuedUsers.length === 1;
  return {
    addedToQueue: true, isActiveUser, position: queue.queuedUsers.length, topic: queue.topic,
  };
}

export async function goToNextUserOfQueue(guildId: string) {
  const queue = await getQueue(guildId);
  if (queue === null) {
    return null;
  }
  const oldUser = queue.queuedUsers.shift();
  return {
    oldUser,
    activeUser: getActiveUserOfQueue(queue),
    queuedUsers: queue.queuedUsers,
    topic: queue.topic,
  } || null;
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
  return { topic: queue.topic };
}
