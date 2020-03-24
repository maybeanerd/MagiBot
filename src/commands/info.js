module.exports = {
  main: (bot, msg) => {
    const info: Array<{
      name: string;
      value: string;
      inline: boolean;
    }> = [];

    info.push({
      name: 'Links',
      value: '[Invite me to your guild](https://discordapp.com/oauth2/authorize?client_id=384820232583249921&permissions=8&redirect_uri=https%3A%2F%2Fdiscord.gg%2F2Evcf4T&scope=bot)\n[Official support Discord](https://discord.gg/2Evcf4T)',
      inline: false,
    });

    info.push({
      name: 'How to support MagiBot',
      value: `Donate a buck via [Paypal](https://paypal.me/pools/c/8be5ok31vB)\nPledge on [MagiBots Patreon](https://www.patreon.com/MagiBot)\nVote on [discordbots.org](https://discordbots.org/bot/384820232583249921) and [bots.ondiscord.xyz](https://bots.ondiscord.xyz/bots/384820232583249921)!\n(daily vote reminder via *${bot.PREFIXES[msg.guild.id]}.dbl*)`,
      inline: false,
    });

    info.push({
      name: 'A bit of background',
      value: "MagiBot is being developed in Germany by T0TProduction#0001 as a hobby project.\nIt was originally a private bot for a Discord guild themed after the Pokemon Magikarp which is the reason it's called MagiBot.",
      inline: false,
    });

    const embed = {
      color: bot.COLOR,
      description: 'Some information about the bot:',
      fields: info,
      footer: {
        /* eslint-disable camelcase */
        icon_url: bot.user.avatarURL,
        /* eslint-enable camelcase */
        text: bot.SIGN,
      },
    };

    msg.channel.send({ embed });
  },
  ehelp() {
    return [{ name: '', value: 'Get some info about the bot as well as links to official MagiBot stuff.' }];
  },
  perm: 'SEND_MESSAGES',
  admin: false,
  hide: false,
  category: 'Miscellaneous',
};
