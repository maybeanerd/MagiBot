import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, Message } from 'discord.js';
import {
  asyncForEach,
  interactionConfirmation,
} from '../helperFunctions';
import { commandCategories } from '../types/enums';
import { DeferReply, MagibotSlashCommand } from '../types/command';
import { Vote, VoteModel } from '../db';

export const reactions = [
  '🇦',
  '🇧',
  '🇨',
  '🇩',
  '🇪',
  '🇫',
  '🇬',
  '🇭',
  '🇮',
  '🇯',
  '🇰',
  '🇱',
  '🇲',
  '🇳',
  '🇴',
  '🇵',
  '🇶',
  '🇷',
  '🇸',
  '🇹',
];

function getTime(content: string) {
  const regex = /^(?:(\d+)d\s*?)?(?:(\d+)h\s*?)?(?:(\d+)m\s*?)?$/;
  const matched = content.match(regex);
  if (matched) {
    const d = parseInt(matched[1], 10) || 0;
    const h = parseInt(matched[2], 10) || 0;
    const m = parseInt(matched[3], 10) || 0;
    if (d + h + m > 0) {
      return [d, h, m];
    }
    return false;
  }
  return false;
}

async function addVote(vote: Vote) {
  const voteCreated = new VoteModel(vote);
  await voteCreated.save();
  return voteCreated.toObject();
}

async function main(interaction: CommandInteraction) {
  const authorID = interaction.member!.user.id;
  const topic = interaction.options.getString('topic', true);
  const duration = getTime(interaction.options.getString('duration', true));
  if (!duration) {
    interaction.followUp('Please use a valid duration.');
    return;
  }
  const [days, hours, minutes] = duration;
  if (days > 7 || (days === 7 && (hours > 0 || minutes > 0))) {
    interaction.followUp(
      'Votes are not allowed to last longer than 7 days, please use a valid duration.',
    );
    return;
  }
  const options = reactions
    .map((reaction, index) => interaction.options.getString(`option-${index + 1}`))
    .filter((option) => option !== null) as Array<string>;

  let optionsString = '';
  options.forEach((value, index) => {
    optionsString += `${reactions[index]} ${value}\n`;
  });

  let timeString = '';
  const times = ['days ', 'hours ', 'minutes '];
  duration.forEach((value, index) => {
    if (value > 0) {
      timeString += `${value} ${times[index]}`;
    }
  });

  const wantsToStartVote = await interactionConfirmation(
    interaction,
    `Do you want to start the vote **${topic}** lasting **${timeString}**with the options\n${optionsString}`,
    `Successfully canceled vote **${topic}**`,
    'Canceled vote due to timeout.',
  );

  if (wantsToStartVote) {
    const dat = new Date();
    const date = new Date(
      dat.getFullYear(),
      dat.getMonth(),
      dat.getDate() + days,
      dat.getHours() + hours,
      dat.getMinutes() + minutes,
      dat.getSeconds(),
      0,
    );

    const reply = await wantsToStartVote.followUp(
      `**${topic}**\n*by ${interaction.member}, ends on ${date}*\n\n${optionsString}`,
    );
    if (reply instanceof Message) {
      asyncForEach(options, async (value, index) => {
        await reply.react(reactions[index as number]);
      });
      // vote structure
      // TODO validate if this is what we still need/can even use!
      const vote: Vote = {
        messageID: reply.id,
        channelID: reply.channel.id,
        options,
        topic,
        date,
        guildid: reply.guild!.id,
        authorID,
      };
      await addVote(vote);
    } else {
      throw Error('Answer was not a message.');
    }
  }
}

const slashCommand = new SlashCommandBuilder()
  .setName('vote')
  .setDescription(
    `Start a vote with up to ${reactions.length} options that can last up to a week.`,
  )
  .addStringOption((option) => option
    .setName('topic')
    .setDescription('The topic of the vote.')
    .setRequired(true))
  .addStringOption((option) => option
    .setName('duration')
    .setDescription(
      'Duration of the vote. Use d h m format, e.g.: `2d 3h 5m`',
    )
    .setRequired(true));

// Add place for all twenty options
reactions.forEach((reaction, index) => {
  slashCommand.addStringOption((option) => option
    .setName(`option-${index + 1}`)
    .setDescription('An option users can vote for.')
  // make at least two options required
    .setRequired(index < 2));
});

export const vote: MagibotSlashCommand = {
  help() {
    return [
      {
        name: '',
        value: `Start a vote with up to ${reactions.length} different options. The maximum duration is 7 days.`,
      },
    ];
  },
  permissions: ['ADD_REACTIONS', 'READ_MESSAGE_HISTORY', 'VIEW_CHANNEL'],
  definition: slashCommand.toJSON(),
  run: main,
  category: commandCategories.util,
  defer: DeferReply.ephemeral,
};