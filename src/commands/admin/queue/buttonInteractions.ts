// TODO migrate button interactions from /admin/queue.ts here
// to use them in global interaction lsitener

import { ButtonInteraction, Message, VoiceChannel } from 'discord.js';
import { asyncWait, buttonInteractionId, doNothingOnError } from '../../../helperFunctions';
import { addUserToQueue } from './stateManager';

function isInteractionQueueRelated(interaction: ButtonInteraction) {
  return interaction.customId.startsWith(
    `${buttonInteractionId.queue}-${interaction.guildId}-`,
  );
}

function messageEdit(
  voiceChannel: VoiceChannel | null | undefined,
  activeUser: string | null,
  queuedUsers: Array<string>,
  topic: string,
) {
  let msg = `Queue: **${topic}**`;
  if (voiceChannel) {
    msg += `\n*with voicemode activated in* ${voiceChannel}`;
  }
  let nextUsers = '\n';
  if (queuedUsers.length > 0) {
    for (let i = 0; i < 10 && i < queuedUsers.length; i++) {
      // TODO validate user mentioning
      nextUsers += `- <@${queuedUsers[i]}>\n`;
    }
  } else {
    nextUsers = ' no more queued users\n';
  }
  // TODO validate user mentioning
  return `${msg}\n*${queuedUsers.length} queued users left*\n\nCurrent user: **<@${activeUser}>**\n\nNext up are:${nextUsers}\nUse the buttons below to join and leave the queue!`;
}

// eslint being stupid again
// eslint-disable-next-line no-shadow
const enum typeOfQueueAction {
  next = 'next',
  end = 'end',
  join = 'join',
  leave = 'leave',
}

async function onQueueAction(buttonInteraction: ButtonInteraction) {
  const typeOfAction = buttonInteraction.customId.split(
    '-',
  )[2] as typeOfQueueAction;
  const actionUserId = buttonInteraction.user.id;
  const guildId = buttonInteraction.guildId!;
  const topicMessage = buttonInteraction.message as Message;

  const voiceChannel : null | VoiceChannel = null; // for now let's not have VC yet

  switch (typeOfAction) {
  case typeOfQueueAction.join:
    // eslint-disable-next-line no-case-declarations
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
          if (voiceChannel) {
          // TODO rework muting in here
          // unmute currentUser
            const currentMember = await buttonInteraction.guild!.members.fetch(
              actionUserId,
            );
            if (currentMember) {
              currentMember.voice
                .setMute(false, 'Its their turn in the queue')
                .catch(doNothingOnError);
            }
          }
          topicMessage
            .edit(
              messageEdit(
                voiceChannel,
                actionUserId,
                [],
                addUserResponse.topic,
              ),
            )
            .catch(doNothingOnError);
          if (!isActiveUser) {
            buttonInteraction.reply({
              content: `Successfully joined the queue! Your position is: ${addUserResponse.position}`,
              ephemeral: true,
            });
          }
        }
      } else {
        buttonInteraction.reply({
          content: `You were already in the queue! Your current position is: ${
            addUserResponse.position
          }`,
          ephemeral: true,
        });
      }
    }
    break;
  case typeOfQueueAction.leave:
    if (queuedUsers.includes(actionUserId)) {
      const ind = queuedUsers.findIndex((obj) => obj.id === actionUserId.id);
      queuedUsers.splice(ind, 1);
      topicMessage
        .edit(
          messageEdit(
            voiceChannel,
            sharedQueueData.activeUser,
            queuedUsers,
            topic,
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
    break;
  case typeOfQueueAction.next:
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
    if (queuedUsers[0]) {
      if (voiceChannel) {
        // mute old current user
        if (sharedQueueData.activeUser) {
          const currentMember = await buttonInteraction.guild!.members.fetch(
            sharedQueueData.activeUser,
          );
          currentMember.voice
            .setMute(true, 'its not your turn in the queue anymore')
            .catch(doNothingOnError);
        }
      }
      // eslint-disable-next-line no-param-reassign
      sharedQueueData.activeUser = queuedUsers.shift()!;
      topicMessage
        .edit(
          messageEdit(
            voiceChannel,
            sharedQueueData.activeUser,
            queuedUsers,
            topic,
          ),
        )
        .catch(doNothingOnError);
      const message = (await buttonInteraction.reply({
        fetchReply: true,
        content: `It's your turn ${sharedQueueData.activeUser}!`,
      })) as Message;
      asyncWait(1000).then(() => message.delete());
      if (voiceChannel) {
        // unmute currentUser
        const currentMember = await buttonInteraction.guild!.members.fetch(
          sharedQueueData.activeUser,
        );
        if (currentMember) {
          currentMember.voice
            .setMute(false, 'Its their turn in the queue')
            .catch(doNothingOnError);
        }
      }
    } else {
      buttonInteraction.reply({
        content: 'There are no users left in the queue!',
        ephemeral: true,
      });
    }
    break;
  case typeOfQueueAction.end:
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
    collector.stop('Ended by user.');
    break;
  default:
    break;
  }
}

export async function onInteraction(interaction: ButtonInteraction) {
  const isQueueRelated = isInteractionQueueRelated(interaction);
  if (!isQueueRelated) {
    return false;
  }
  await onQueueAction(interaction);
  // TODO implement queue logic
  return true;
}
