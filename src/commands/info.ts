import {
  APIEmbed,
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
} from 'discord.js';
import { getBotInviteUrl } from '../helperFunctions';
import { user, SIGN } from '../shared_assets';
import { MagibotSlashCommand } from '../types/command';

async function main(interaction: ChatInputCommandInteraction) {
  const info: Array<{
    name: string;
    value: string;
    inline: boolean;
  }> = [
    {
      name: 'Links',
      value: `[Invite me to your guild](${getBotInviteUrl()})\n[Official support Discord](https://discord.gg/2Evcf4T)`,
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
  const embed: APIEmbed = {
    color: (interaction.member as GuildMember).displayColor,
    description: 'Some information about the bot:',
    fields: info,
    footer: {
      icon_url: user().avatarURL() || '',
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
