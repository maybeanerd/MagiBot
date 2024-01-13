import { SlashCommandBuilder } from '@discordjs/builders';
import { APIEmbed } from 'discord-api-types/v10';
import { CommandInteraction, GuildMember } from 'discord.js';
import { getBotInviteUrl } from '../helperFunctions';
import { user, SIGN } from '../shared_assets';
import { MagibotSlashCommand } from '../types/command';

async function main(interaction: CommandInteraction) {
  const info: Array<{
    name: string;
    value: string;
    inline: boolean;
  }> = [
    {
      name: 'Useful links',
      value: `[Invite me to your guild](${getBotInviteUrl()})\n[Official support Discord](https://discord.gg/2Evcf4T)`,
      inline: false,
    },
    {
      name: 'The code is open source!',
      value:
        'Check out [the repository on GitHub](https://github.com/maybeanerd/MagiBot) and leave a star to show your support.',
      inline: false,
    },
    {
      name: 'How to support the development',
      value:
        'Pledge on [MagiBots Patreon](https://www.patreon.com/MagiBot)\nLeave a review on [bots.ondiscord.xyz](https://bots.ondiscord.xyz/bots/384820232583249921)',
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
