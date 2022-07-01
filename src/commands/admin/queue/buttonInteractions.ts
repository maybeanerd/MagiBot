import {
  ButtonInteraction, GuildMember, Message,
} from 'discord.js';
import { onQueueEnd, typeOfQueueAction } from '.';
import { isAdmin } from '../../../dbHelpers';
import {
  asyncWait, buttonInteractionId, doNothingOnError, getUserMention,
} from '../../../helperFunctions';
import {
  addUserToQueue, goToNextUserOfQueue, maximumQueueLength, removeUserFromQueue,
} from './stateManager';

function isInteractionQueueRelated(interaction: ButtonInteraction) {
  return interaction.customId.startsWith(
    `${buttonInteractionId.queue}-${interaction.guildId}-`,
  );
}

function messageEdit(
  activeUser: string | null,
  queuedUsers: Array<string>,
  topic: string,
) {
  const msg = `Queue: **${topic}**`;
  let nextUsers = '\n';
  if (queuedUsers.length > 1) {
    for (let i = 1; i <= 10 && i < queuedUsers.length; i++) {
      nextUsers += `- ${getUserMention(queuedUsers[i])}\n`;
    }
  } else {
    nextUsers = ' no more queued users\n';
  }
  return `${msg}\n*${queuedUsers.length - 1}/99 users queued*\n\nCurrent user: **${getUserMention(activeUser)}**\n\nNext up are:${nextUsers}\nUse the buttons below to join and leave the queue!`;
}

async function onQueueAction(buttonInteraction: ButtonInteraction) {
  const typeOfAction = buttonInteraction.customId.split(
    '-',
  )[2] as typeOfQueueAction;
  const actionUserId = buttonInteraction.user.id;
  const guildId = buttonInteraction.guildId!;
  const topicMessage = buttonInteraction.message as Message;

  if (typeOfAction === typeOfQueueAction.join) {
    const addUserResponse = await addUserToQueue(guildId, actionUserId);
    if (addUserResponse) {
      if (addUserResponse.addedToQueue) {
        const { isActiveUser } = addUserResponse;
        if (isActiveUser) {
          const message = (await buttonInteraction.reply({
            fetchReply: true,
            content: `It's your turn ${buttonInteraction.user}!`,
          })) as Message;
          asyncWait(1000).then(() => message.delete());
        } else {
          buttonInteraction.reply({
            content: `Successfully joined the queue! Your position is: ${addUserResponse.position}`,
            ephemeral: true,
          });
        }
        topicMessage
          .edit(
            messageEdit(
              addUserResponse.activeUser,
              addUserResponse.queuedUsers,
              addUserResponse.topic,
            ),
          )
          .catch(doNothingOnError);
      } else if (addUserResponse.position !== null) {
        buttonInteraction.reply({
          content: `You were already in the queue! Your current position is: ${
            addUserResponse.position
          }`,
          ephemeral: true,
        });
      } else {
        buttonInteraction.reply({
          content: `Couldn't join the queue because the maximum amount of ${maximumQueueLength} users has been reached.
Try again later!`,
          ephemeral: true,
        });
      }
    }
  } else if (typeOfAction === typeOfQueueAction.leave) {
    const userLeftQueue = await removeUserFromQueue(guildId, actionUserId);
    if (userLeftQueue) {
      topicMessage
        .edit(
          messageEdit(
            userLeftQueue.activeUser,
            userLeftQueue.queuedUsers,
            userLeftQueue.topic,
          ),
        )
        .catch(doNothingOnError);
      buttonInteraction.reply({
        content: 'Successfully left the queue!',
        ephemeral: true,
      });
    } else {
      buttonInteraction.reply({
        content: 'You are not in the queue anyways!',
        ephemeral: true,
      });
    }
  } else if (typeOfAction === typeOfQueueAction.next) {
    // only admins of guild are allowed to do this
    if (
      !(await isAdmin(
          buttonInteraction.guild!.id,
          buttonInteraction.member as GuildMember,
      ))
    ) {
      buttonInteraction.reply({
        content: 'You are not allowed to use this!',
        ephemeral: true,
      });
      return;
    }
    const wentToNextUser = await goToNextUserOfQueue(guildId);
    if (wentToNextUser && wentToNextUser.activeUser) {
      topicMessage
        .edit(
          messageEdit(
            wentToNextUser.activeUser,
            wentToNextUser.queuedUsers,
            wentToNextUser.topic,
          ),
        )
        .catch(doNothingOnError);
      const message = (await buttonInteraction.reply({
        fetchReply: true,
        content: `It's your turn ${getUserMention(wentToNextUser.activeUser)}!`,
      })) as Message;
      asyncWait(1000).then(() => message.delete());
    } else {
      buttonInteraction.reply({
        content: 'There are no users left in the queue!',
        ephemeral: true,
      });
    }
  } else if (typeOfAction === typeOfQueueAction.end) {
    // only admins of guild are allowed to do this
    if (
      !(await isAdmin(
          buttonInteraction.guild!.id,
          buttonInteraction.member as GuildMember,
      ))
    ) {
      buttonInteraction.reply({
        content: 'You are not allowed to use this!',
        ephemeral: true,
      });
      return;
    }
    buttonInteraction.reply({
      content: 'Successfully ended the queue!',
      ephemeral: true,
    });
    await onQueueEnd(buttonInteraction.guild!);
  }
}

export async function onInteraction(interaction: ButtonInteraction) {
  const isQueueRelated = isInteractionQueueRelated(interaction);
  if (!isQueueRelated) {
    return false;
  }
  await onQueueAction(interaction);
  return true;
}
