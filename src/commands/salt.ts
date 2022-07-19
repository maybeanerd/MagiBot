import {
  APIEmbed,
  ChatInputCommandInteraction,
  Guild,
  SlashCommandBuilder,
  User,
} from 'discord.js';
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

export async function addSalt(
  interaction: ChatInputCommandInteraction,
  reportedUser: User,
  fromAdmin = false,
) {
  if (reportedUser.id === interaction.user.id) {
    await interaction.reply("You can't report yourself!");
    return;
  }
  if (reportedUser.bot) {
    await interaction.reply("You can't report bots!");
    return;
  }
  const time = await saltUp(
    reportedUser.id,
    interaction.user.id,
    interaction.guild!,
    fromAdmin,
  );
  if (time === 0) {
    await interaction.reply(
      `Successfully reported ${reportedUser} for being salty!`,
    );
    return;
  }
  await interaction.reply(
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

async function getTopSalters(interaction: ChatInputCommandInteraction) {
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
  const embed: APIEmbed = {
    color: 0xffffff,
    description: `Top 5 salter in ${guild.name}:`,
    fields: await Promise.all(info),
    footer: {
      icon_url: guild.iconURL() || '',
      text: guild.name,
    },
  };
  await interaction.reply({ embeds: [embed] });
}

const slashCommand = new SlashCommandBuilder()
  .setName('salt')
  .setDescription('Interact with the salt ranking of this server!')
  .setDMPermission(false)
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

async function runCommand(interaction: ChatInputCommandInteraction) {
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
  permissions: [],
  run: runCommand,
  definition: slashCommand.toJSON(),
};
