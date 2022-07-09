import { CommandInteraction, MessageEmbedOptions } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { COLOR, user, SIGN } from '../shared_assets';
import { MagibotSlashCommand } from '../types/command';

const inviteURL = 'https://discord.com/api/oauth2/authorize?client_id=384820232583249921&permissions=276131153&redirect_uri=https%3A%2F%2Fdiscord.gg%2F2Evcf4T&scope=bot';

async function main(interaction: CommandInteraction) {
  const info: Array<{
    name: string;
    value: string;
    inline: boolean;
  }> = [
    {
      name: 'Links',
      value: `[Invite me to your guild](${inviteURL})\n[Official support Discord](https://discord.gg/2Evcf4T)`,
      inline: false,
    },
    {
      name: 'How to support MagiBot',
      value:
        'Pledge on [MagiBots Patreon](https://www.patreon.com/MagiBot)\nLeave a review on [bots.ondiscord.xyz](https://bots.ondiscord.xyz/bots/384820232583249921)!',
      inline: false,
    },
    {
      name: 'A bit of background',
      value:
        "MagiBot is being developed in Germany by T0TProduction#0001 as a side project.\nIt was originally a private bot for a Discord guild themed after the Pokemon Magikarp which is the reason it's called MagiBot.",
      inline: false,
    },
  ];
  const embed: MessageEmbedOptions = {
    color: COLOR,
    description: 'Some information about the bot:',
    fields: info,
    footer: {
      iconURL: user().avatarURL() || '',
      text: SIGN,
    },
  };

  interaction.reply({ embeds: [embed] });
}

const slashCommand = new SlashCommandBuilder()
  .setName('info')
  .setDescription('Get some info about the bot and official resources.')
  .setDMPermission(false);

export const info: MagibotSlashCommand = {
  run: main,
  definition: slashCommand.toJSON(),
  permissions: [],
};
