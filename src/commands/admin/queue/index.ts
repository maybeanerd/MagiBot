import {
  MessageActionRow,
  MessageButton,
  CommandInteraction,
  Message,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import {
  buttonInteractionId, doNothingOnError,
} from '../../../helperFunctions';
import { commandCategories } from '../../../types/enums';
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

const defaultQueueLengthInMinutes = 120;

async function startQueue(interaction: CommandInteraction, topic: string) {
  const guild = interaction.guild!;

  const millisecondsUntilEnd = defaultQueueLengthInMinutes * 60000;
  const endDate = new Date(Date.now() + millisecondsUntilEnd);

  const createdQueue = await tryToCreateQueue(guild.id, interaction.id, topic, endDate);

  if (!createdQueue) {
    interaction.followUp(
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

  await interaction.followUp({
    content: `Queue: **${topic}:**\n\nUse the buttons below to join the queue!`,
    components: [row, rowTwo],
  });
}

export async function onQueueEnd(
  guildId: string,
  topicMessage?: Message,
) {
  const queueEnded = await removeQueue(guildId);
  if (queueEnded) {
    if (topicMessage) {
      topicMessage
        .edit({ content: `**${queueEnded.topic}** ended.`, components: [] })
        .catch(doNothingOnError);
    }
    return true;
  }
  return false;
}

async function stopRunningQueue(interaction: CommandInteraction) {
  const guildId = interaction.guild!.id;
  const runningQueue = await onQueueEnd(guildId);
  if (runningQueue) {
    await interaction.followUp('Successfully stopped the ongoing queue on this guild.');
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
      .setDescription('Start a queue that can last up to 2h.')
      .addStringOption((option) => option
        .setName('topic')
        .setDescription('The topic of the queue.')
        .setRequired(true)))
    .addSubcommand((subcommand) => subcommand
      .setName('stop')
      .setDescription('Stop running queue. Queue message won\'t be adjusted this way though.'))
    .addSubcommand((subcommand) => subcommand
      .setName('extend')
      .setDescription('Extend the running queue of this server.')));
}

async function runCommand(interaction: CommandInteraction) {
  const subcommand = interaction.options.getSubcommand(true) as
    | 'start'
    | 'stop'
    | 'extend';

  // TODO migrate actual functionality of the main function

  if (subcommand === 'start') {
    const topic = interaction.options.getString('topic', true);
    await startQueue(interaction, topic);
    return;
  }
  if (subcommand === 'stop') {
    await stopRunningQueue(interaction);
    return;
  }
  if (subcommand === 'extend') {
    // TODO do we actually want to allow this?
    console.log('extend');
  }
}

export const queue: MagibotAdminSlashCommand = {
  help() {
    return [
      {
        name: '',
        value:
          'Start a queue that can last up to 2h. There is only a single queue allowed per guild.',
      },
    ];
  },
  permissions: ['SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'VIEW_CHANNEL'], // TODO validate if this is what we need
  category: commandCategories.util,
  run: runCommand,
  registerSlashCommand,
};
