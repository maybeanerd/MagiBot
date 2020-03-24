const data = require(`${__dirname}/../db.js`);
const cmds = require(`${__dirname}/../bamands.js`);

function printHelp() {
  const info: Array<{ name: string; value: string }> = [];

  info.push({
    name: 'rem <@User|userid|nickname>',
    value: 'Remove the joinsound of a user. If you use nickname it has to be at least three characters long',
  });

  return info;
}


module.exports = {
  main: async function main(bot, msg) {
    const args = msg.content.split(/ +/);
    const command = args[0].toLowerCase();
    const mention = args[1];
    switch (command) {
    case 'rem':
      /* eslint-disable no-case-declarations */
      const uid = await cmds.findMember(msg.guild, mention);
      /* eslint-enable no-case-declarations */
      if (mention && uid) {
        if (await data.addSound(uid, false, msg.guild.id)) {
          msg.reply(`you successfully removed <@!${uid}>s joinsound!`);
        } else {
          msg.reply('Aaaaaand you failed.');
        }
      } else {
        msg.reply('you need to mention a user you want to use this on!');
      }
      break;
    default:
      msg.reply(`this command doesn't exist. Use \`${bot.PREFIXES[msg.guild.id]}:help sound\` for more info.`);
      break;
    }
  },
  ehelp(msg, bot) { return printHelp(msg, bot); },
  perm: 'SEND_MESSAGES',
  admin: true,
  hide: false,
  category: 'Utility',
};
