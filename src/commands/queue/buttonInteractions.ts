import { ButtonInteraction } from 'discord.js';
import {
  goToNextUser,
  messageEdit,
  onQueueEnd,
  sendItsYourTurnMessage,
  typeOfQueueAction,
} from '.';
import { buttonInteractionId } from '../../helperFunctions';
import {
  addUserToQueue,
  isCreatorOfQueue,
  maximumQueueLength,
  removeUserFromQueue,
} from './stateManager';

function isInteractionQueueRelated(interaction: ButtonInteraction) {
  return interaction.customId.startsWith(
    `${buttonInteractionId.queue}-${interaction.guildId}-`,
  );
}

async function onQueueAction(buttonInteraction: ButtonInteraction) {
  const typeOfAction = buttonInteraction.customId.split(
    '-',
  )[2] as typeOfQueueAction;
  const actionUserId = buttonInteraction.user.id;
  const guildId = buttonInteraction.guildId!;
  const topicMessage = buttonInteraction.message;

  if (typeOfAction === typeOfQueueAction.join) {
    const addUserResponse = await addUserToQueue(guildId, actionUserId);
    if (addUserResponse) {
      if (addUserResponse.addedToQueue) {
        const { isActiveUser } = addUserResponse;
        if (isActiveUser) {
          await sendItsYourTurnMessage(buttonInteraction, actionUserId);
        } else {
          buttonInteraction.reply({
            content: `Successfully joined the queue! Your position is: ${addUserResponse.position}`,
            ephemeral: true,
          });
        }
        messageEdit(
          topicMessage,
          addUserResponse.activeUser,
          addUserResponse.queuedUsers,
          addUserResponse.topic,
        );
      } else if (addUserResponse.position !== null) {
        buttonInteraction.reply({
          content: `You were already in the queue! Your current position is: ${addUserResponse.position}`,
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
      messageEdit(
        topicMessage,
        userLeftQueue.activeUser,
        userLeftQueue.queuedUsers,
        userLeftQueue.topic,
      );
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
    if (!(await isCreatorOfQueue(guildId, actionUserId))) {
      buttonInteraction.reply({
        content:
          "Only the creator of the queue is allowed to use this! If you're an admin, please use the command `/queue next` instead.",
        ephemeral: true,
      });
      return;
    }
    await goToNextUser(buttonInteraction);
  } else if (typeOfAction === typeOfQueueAction.end) {
    if (!(await isCreatorOfQueue(guildId, actionUserId))) {
      buttonInteraction.reply({
        content:
          "Only the creator of the queue is allowed to use this! If you're an admin, please use the command `/queue end` instead.",
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
