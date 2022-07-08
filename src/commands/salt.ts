import {
  CommandInteraction,
  Guild,
  MessageEmbedOptions,
  User,
} from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { commandCategories } from '../types/enums';
import { MagibotSlashCommand } from '../types/command';
import { SaltModel, SaltrankModel } from '../db';
import { topSalt } from '../dbHelpers';

async function saltDowntimeDone(salterUserId: string, reporterUserId: string) {
  // get newest entry in salt
  const saltEntry = await SaltModel.find({
    salter: salterUserId,
    reporter: reporterUserId,
  })
    .sort({ date: -1 })
    .limit(1);
  if (saltEntry[0]) {
    const now = new Date();
    return (now.getTime() - saltEntry[0].date.getTime()) / 1000 / 60 / 60;
  }
  return 2;
}

export async function saltGuild(
  salter: string,
  guildID: string,
  add = 1,
  reset = false,
) {
  const user = await SaltrankModel.findOne({
    salter,
    guild: guildID,
  });
  if (!user) {
    const myobj = new SaltrankModel({
      salter,
      salt: 1,
      guild: guildID,
    });
    await myobj.save();
  } else {
    const slt = user.salt + add;
    if (slt <= 0 || reset) {
      await SaltrankModel.deleteOne({
        salter,
        guild: guildID,
      });
    } else {
      const update = { $set: { salt: slt } };
      await SaltrankModel.updateOne(
        {
          salter,
          guild: guildID,
        },
        update,
      );
    }
  }
}

async function saltUp(
  salter: string,
  reporter: string,
  guild: Guild,
  admin = false,
) {
  const time = await saltDowntimeDone(salter, reporter);
  if (time > 1 || admin) {
    const date = new Date();
    const myobj = new SaltModel({
      salter,
      reporter,
      date,
      guild: guild.id,
    });
    await myobj.save();
    await saltGuild(salter, guild.id, 1);
    return 0;
  }
  return time;
}

function printHelp() {
  const info: Array<{ name: string; value: string }> = [];
  info.push({
    name: 'report @User',
    value:
      'Report a user being salty. If you use nickname it has to be at least three characters long and unique.\nThis has a 1h cooldown for reporting the same user.',
  });
  info.push({
    name: 'ranking',
    value: 'Displays the top 5 salter of this server.',
  });
  return info;
}

export async function addSalt(
  interaction: CommandInteraction,
  reportedUser: User,
  fromAdmin = false,
) {
  if (reportedUser.id === interaction.user.id) {
    return interaction.reply("You can't report yourself!");
  }
  if (reportedUser.bot) {
    return interaction.reply("You can't report bots!");
  }
  const time = await saltUp(
    reportedUser.id,
    interaction.user.id,
    interaction.guild!,
    fromAdmin,
  );
  if (time === 0) {
    return interaction.reply(
      `Successfully reported ${reportedUser} for being salty!`,
    );
  }
  return interaction.reply(
    `You can report ${reportedUser} again in ${
      59 - Math.floor((time * 60) % 60)
    } min and ${60 - Math.floor((time * 60 * 60) % 60)} sec!`,
  );
}

async function getMemberSaltInfo(
  guild: Guild,
  salter: string,
  index: number,
  salt: number,
) {
  let memberName = 'User left guild';
  const member = await guild.members.fetch(salter).catch(() => {});
  if (member) {
    memberName = member.displayName;
  }
  const name = `${
    index === 0 ? 'Monarch of Salt' : `${index + 1}. place`
  }: ${memberName}`;
  return {
    name,
    value: `${salt} salt`,
    inline: false,
  };
}

async function getTopSalters(interaction: CommandInteraction) {
  const guild = interaction.guild!;
  const salters = await topSalt(guild.id);
  const info: Array<
    Promise<{
      name: string;
      value: string;
      inline: boolean;
    }>
  > = [];
  for (let i = 0; i < 5; i++) {
    if (salters[i]) {
      info.push(
        getMemberSaltInfo(guild, salters[i].salter, i, salters[i].salt),
      );
    } else {
      break;
    }
  }
  const embed: MessageEmbedOptions = {
    color: 0xffffff,
    description: `Top 5 salter in ${guild.name}:`,
    fields: await Promise.all(info),
    footer: {
      iconURL: guild.iconURL() || '',
      text: guild.name,
    },
  };
  return interaction.reply({ embeds: [embed] });
}

const slashCommand = new SlashCommandBuilder()
  .setName('salt')
  .setDescription('Interact with the salt ranking of this server!')
  .addSubcommand((subcommand) => subcommand
    .setName('report')
    .setDescription('Report a user being salty.')
    .addUserOption((option) => option
      .setName('user')
      .setDescription('The user you want to report.')
      .setRequired(true)))
  .addSubcommand((subcommand) => subcommand
    .setName('ranking')
    .setDescription('Get the current ranking of saltyness on this server.'));

async function runCommand(interaction: CommandInteraction) {
  const subcommand = interaction.options.getSubcommand(true) as
    | 'report'
    | 'ranking';
  if (subcommand === 'report') {
    const user = interaction.options.getUser('user', true);
    return addSalt(interaction, user);
  }
  if (subcommand === 'ranking') {
    return getTopSalters(interaction);
  }
  return null;
}

export const salt: MagibotSlashCommand = {
  help() {
    return printHelp();
  },
  permissions: [],
  category: commandCategories.fun,
  run: runCommand,
  definition: slashCommand.toJSON(),
};
