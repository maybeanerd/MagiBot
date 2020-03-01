const data = require(`${__dirname}/../db.js`);
const cmds = require(`${__dirname}/../bamands.js`);

function printHelp() {
  const info = [];

  info.push({
    name: 'add <@user|userid|nickname>',
    value: 'Report a user for being salty',
  });

  info.push({
    name: 'rem <@user|userid|nickname>',
    value: 'Remove the oldest salt report of a user',
  });

  info.push({
    name: 'clr <@user|userid|nickname>',
    value: 'Clear all salt of a user',
  });

  info.push({
    name: 'reset',
    value: 'Reset all salt of this guild. Use with caution',
  });

  return info;
}

module.exports = {
  main: async function main(bot, msg) {
    const args = msg.content.split(/ +/);
    const command = args[0].toLowerCase();
    if (msg.guild) {
      const mention = args[1];
      const uid = await cmds.findMember(msg.guild, mention);
      if (!(mention && uid)) {
        if (command == 'reset') {
          if (await cmds.yesOrNo(msg, 'Do you really want to reset all salt on this server?', 'Successfully canceled salt reset.')) {
            data.resetSalt(msg.guild);
            msg.channel.send(`Successfully reset all salt on **${msg.guild.name}**!`);
          }
          return;
        }
        msg.reply('you need to mention a user you want to use this on!');
        return;
      }
      let mem;
      switch (command) {
      case 'add':
        mem = await msg.guild.fetchMember(uid).catch(() => { });
        if (!mem) {
          msg.reply("the user with this ID doesn't exist on this guild.");
          return;
        }
        if (mem.user.bot) {
          msg.reply("you can't report bots!");
          return;
        }
        await data.saltUpAdmin(uid, msg.author.id, msg.guild);
        msg.channel.send(`Successfully reported ${mem} for being a salty bitch!`);
        break;
      case 'rem':
        mem = await msg.guild.fetchMember(uid).catch(() => { });
        if (!mem) {
          msg.reply("the user with this ID doesn't exist on this guild.");
          return;
        }
        if (mem.user.bot) {
          msg.reply('bots are never salty!');
          return;
        }
        if (await data.remOldestSalt(uid, msg.guild)) {
          msg.channel.send(`Successfully removed the oldest salt from ${mem}!`);
        } else {
          msg.channel.send(`${mem} has no salt that could be removed!`);
        }
        break;
      case 'clr':
        mem = await msg.guild.fetchMember(uid).catch(() => { });
        if (!mem) {
          msg.reply("the user with this ID doesn't exist on this guild.");
          return;
        }
        if (mem.user.bot) {
          msg.reply('bots are never salty!');
          return;
        }
        await data.clrSalt(uid, msg.guild);
        msg.channel.send(`Successfully cleared all salt from ${mem}!`);
        break;
      default:
        msg.reply(`this command doesn't exist. Use \`${bot.PREFIXES[msg.guild.id]}:help salt\` to get more info.`);
        break;
      }
    } else {
      msg.reply('Commands are only available on guilds.');
    }
  },
  ehelp(msg, bot) { return printHelp(msg, bot); },
  perm: 'SEND_MESSAGES',
  admin: true,
  hide: false,
  category: 'Utility',
};
