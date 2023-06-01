import {
  CommandInteraction,
  Guild,
  TextChannel,
  Message,
  ButtonInteraction,
  ChatInputCommandInteraction,
} from 'discord.js';
import { ButtonStyle, PermissionFlagsBits } from 'discord-api-types/v10';
import {
  ActionRowBuilder,
  ButtonBuilder,
  SlashCommandBuilder,
} from '@discordjs/builders';
import {
  asyncWait,
  buttonInteractionId,
  doesInteractionRequireFollowup,
  doNothingOnError,
  getUserMention,
} from '../../helperFunctions';
import { DeferReply, MagibotSlashCommand } from '../../types/command';
import {
  goToNextUserOfQueue,
  maximumQueueLength,
  removeQueue,
  tryToCreateQueue,
} from './stateManager';

// eslint being stupid again
// eslint-disable-next-line no-shadow
export const enum typeOfQueueAction {
  next = 'next',
  end = 'end',
  join = 'join',
  leave = 'leave',
}

async function startQueue(interaction: CommandInteraction, topic: string) {
  const guild = interaction.guild!;

  const originalMessage = (await interaction.followUp(
    'Creating Queue...',
  )) as Message;

  const createdQueue = await tryToCreateQueue(
    guild.id,
    interaction.channelId,
    originalMessage.id,
    interaction.member!.user.id,
    topic,
  );

  if (!createdQueue) {
    originalMessage.edit(
      "There's already an ongoing queue on this guild. For performance reasons only one queue per guild is allowed. To end it, use `/queue end`.",
    );
    return;
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.next}`,
      )
      .setLabel('Next User')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(
        `${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.end}`,
      )
      .setLabel('End Queue')
      .setStyle(ButtonStyle.Secondary),
  );

  const rowTwo = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(
        `${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.join}`,
      )
      .setLabel('Join Queue')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(
        `${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.leave}`,
      )
      .setLabel('Leave Queue')
      .setStyle(ButtonStyle.Secondary),
  );

  await originalMessage.edit({
    content: `Queue **${topic}** :\n\nUse the buttons below to join the queue!`,
    components: [row as any, rowTwo], // somehow types are not fully compatible
  });
}

export async function onQueueEnd(guild: Guild) {
  const queue = await removeQueue(guild.id);
  if (queue) {
    const channel = await guild.channels
      .fetch(queue.channelId)
      .catch(doNothingOnError);
    if (channel) {
      const topicMessage = await (channel as TextChannel).messages
        .fetch(queue.messageId)
        .catch(doNothingOnError);
      if (topicMessage) {
        topicMessage
          .edit({
            content: `The queue **${queue.topic}** ended.`,
            components: [],
          })
          .catch(doNothingOnError);
      }
      return true;
    }
  }
  return false;
}

async function endRunningQueue(
  interaction: CommandInteraction | ButtonInteraction,
) {
  const guild = interaction.guild!;
  const runningQueue = await onQueueEnd(guild);

  const messageContent = runningQueue
    ? 'Successfully ended the ongoing queue on this guild.'
    : "There's no ongoing queue on this guild.";

  if (doesInteractionRequireFollowup(interaction)) {
    interaction.followUp(messageContent);
  } else {
    interaction.reply(messageContent);
  }
}

export function messageEdit(
  message: Message,
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
  return message
    .edit(
      `${msg}\n*${
        queuedUsers.length
      }/${maximumQueueLength} users queued*\n\nCurrent user: **${
        activeUser ? getUserMention(activeUser) : 'Nobody'
      }**\n\nNext up are:${nextUsers}\nUse the buttons below to join and leave the queue!`,
    )
    .catch(doNothingOnError);
}

export async function sendItsYourTurnMessage(
  interaction: CommandInteraction | ButtonInteraction,
  userId: string,
) {
  const messageContent = {
    fetchReply: true,
    content: `It's your turn ${getUserMention(userId)}!`,
  };
  const message = (
    doesInteractionRequireFollowup(interaction)
      ? await interaction.followUp(messageContent)
      : await interaction.reply(messageContent)
  ) as Message;
  asyncWait(1000).then(() => message.delete());
}

export async function goToNextUser(
  interaction: CommandInteraction | ButtonInteraction,
) {
  const guild = interaction.guild!;
  const wentToNextUser = await goToNextUserOfQueue(guild.id);

  if (wentToNextUser) {
    const channel = await guild.channels.fetch(wentToNextUser.channelId);
    if (!channel) {
      throw new Error(
        `Failed to get channel of queue message. GuildId: ${guild.id}; ChannelId: ${wentToNextUser.channelId}`,
      );
    }

    const topicMessage = await (channel as TextChannel).messages.fetch(
      wentToNextUser.messageId,
    );
    if (!topicMessage) {
      throw new Error(
        `Failed to get queue message. GuildId: ${guild.id}; ChannelId: ${wentToNextUser.channelId}; MessageId: ${wentToNextUser.messageId}`,
      );
    }

    messageEdit(
      topicMessage,
      wentToNextUser.activeUser,
      wentToNextUser.queuedUsers,
      wentToNextUser.topic,
    );
  }
  if (wentToNextUser && wentToNextUser.activeUser) {
    await sendItsYourTurnMessage(interaction, wentToNextUser.activeUser);
  } else {
    const messageContent = {
      content: 'There are no users left in the queue!',
      ephemeral: true,
    };
    if (doesInteractionRequireFollowup(interaction)) {
      interaction.followUp(messageContent);
    } else {
      interaction.reply(messageContent);
    }
  }
}

const slashCommand = new SlashCommandBuilder()
  .setName('queue')
  .setDescription(
    'Manage queues for events such as karaoke or playing view viewers.',
  )
  .setDMPermission(false)
  // only allow administrators to use these commands by default
  .setDefaultMemberPermissions(
    // eslint-disable-next-line no-bitwise
    PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageGuild,
  )
  .addSubcommand((subcommand) => subcommand
    .setName('start')
    .setDescription(
      'Start a queue. Only one active queue per guild is allowed.',
    )
    .addStringOption((option) => option
      .setName('topic')
      .setDescription('The topic of the queue.')
      .setRequired(true)))
  .addSubcommand((subcommand) => subcommand
    .setName('end')
    .setDescription('End the running queue on this guild.'))
  .addSubcommand((subcommand) => subcommand
    .setName('next')
    .setDescription('Go to the next user of the running queue.'));

async function runCommand(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand(true) as
    | 'start'
    | 'end'
    | 'next';

  if (subcommand === 'start') {
    const topic = interaction.options.getString('topic', true);
    await startQueue(interaction, topic);
    return;
  }
  if (subcommand === 'end') {
    await endRunningQueue(interaction);
    return;
  }
  if (subcommand === 'next') {
    await goToNextUser(interaction);
  }
}

export const queue: MagibotSlashCommand = {
  permissions: [
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.ViewChannel,
  ],
  run: runCommand,
  definition: slashCommand.toJSON(),
  defer: DeferReply.public,
};
