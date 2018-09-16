
module.exports = {
  async main(bot, msg) {
    if (!(await msg.content.length > 0)) {
      msg.reply(`you need to add info about the report after the command. Use \`${bot.PREFIXES[msg.guild.id]}.help bug\` to get more info.`);
      return;
    }
    msg.channel.send(`Do you want to send this bugreport?\n${msg.content}`).then(mess => {
      const filter = (reaction, user) => (reaction.emoji.name == '☑' || reaction.emoji.name == '❌') && user.id === msg.author.id;
      mess.react('☑');
      mess.react('❌');
      mess.awaitReactions(filter, { max: 1, time: 20000 }).then(reacts => {
        mess.delete();
        if (reacts.first() && reacts.first().emoji.name == '☑') {
          const chann = bot.channels.get('444529194949672972');
          chann.send(`**Bugreport** by ${msg.author.username} (<@${msg.author.id}>) on server ${msg.guild.name}( ${msg.guild.id} ) :\n${msg.content}`).then(() => {
            msg.channel.send('Succesfully sent bugreport.');
          });
        } else if (reacts.first()) {
          msg.channel.send('Successfully canceled bugreport.');
        }
      });
    });
  },
  admin: false,
  ehelp() {
    return [{ name: '<bugreport with information about what you did, what was expected, and what went wrong>', value: 'Report a bug concerning MagiBot' }];
  },
  perm: 'SEND_MESSAGES',
  hide: false,
  dev: false,
  category: 'Miscellaneous'
};
