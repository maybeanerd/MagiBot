import {
  MessageActionRow,
  MessageButton,
  CommandInteraction,
  Guild,
  TextChannel,
  Message,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import {
  buttonInteractionId,
  doNothingOnError,
} from '../../../helperFunctions';
import { MagibotAdminSlashCommand } from '../../../types/command';
import { removeQueue, tryToCreateQueue } from './stateManager';

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
    topic,
  );

  if (!createdQueue) {
    originalMessage.edit(
      "There's already an ongoing queue on this guild. For performance reasons only one queue per guild is allowed.",
    );
    return;
  }

  const row = new MessageActionRow();
  row.addComponents(
    new MessageButton()
      .setCustomId(
        `${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.next}`,
      )
      .setLabel('Next User')
      .setStyle('PRIMARY'),
  );
  row.addComponents(
    new MessageButton()
      .setCustomId(
        `${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.end}`,
      )
      .setLabel('End Queue')
      .setStyle('SECONDARY'),
  );
  const rowTwo = new MessageActionRow();
  rowTwo.addComponents(
    new MessageButton()
      .setCustomId(
        `${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.join}`,
      )
      .setLabel('Join Queue')
      .setStyle('SUCCESS'),
  );
  rowTwo.addComponents(
    new MessageButton()
      .setCustomId(
        `${buttonInteractionId.queue}-${guild.id}-${typeOfQueueAction.leave}`,
      )
      .setLabel('Leave Queue')
      .setStyle('SECONDARY'),
  );

  await originalMessage.edit({
    content: `Queue: **${topic}:**\n\nUse the buttons below to join the queue!`,
    components: [row, rowTwo],
  });
}

export async function onQueueEnd(guild: Guild) {
  const queue = await removeQueue(guild.id);
  if (queue) {
    const channel = await guild.channels.fetch(queue.channelId);
    if (channel) {
      const topicMessage = await (channel as TextChannel).messages.fetch(
        queue.messageId,
      );
      if (topicMessage) {
        topicMessage
          .edit({ content: `**${queue.topic}** ended.`, components: [] })
          .catch(doNothingOnError);
      }
      return true;
    }
  }
  return false;
}

async function stopRunningQueue(interaction: CommandInteraction) {
  const guild = interaction.guild!;
  const runningQueue = await onQueueEnd(guild);
  if (runningQueue) {
    await interaction.followUp(
      'Successfully stopped the ongoing queue on this guild.',
    );
  } else {
    await interaction.followUp("There's no ongoing queue on this guild.");
  }
}

function registerSlashCommand(builder: SlashCommandBuilder) {
  return builder.addSubcommandGroup((subcommandGroup) => subcommandGroup
    .setName('queue')
    .setDescription(
      'Manage queues for events such as karaoke or playing view viewers.',
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
      .setName('stop')
      .setDescription('Stop the running queue on this guild.')));
}

async function runCommand(interaction: CommandInteraction) {
  const subcommand = interaction.options.getSubcommand(true) as
    | 'start'
    | 'stop';

  if (subcommand === 'start') {
    const topic = interaction.options.getString('topic', true);
    await startQueue(interaction, topic);
    return;
  }
  if (subcommand === 'stop') {
    await stopRunningQueue(interaction);
  }
}

export const queue: MagibotAdminSlashCommand = {
  permissions: ['READ_MESSAGE_HISTORY', 'VIEW_CHANNEL'],
  run: runCommand,
  registerSlashCommand,
};
