const data = require(`${__dirname}/../db.js`);

module.exports = {
  async main(bot, msg) {
    const users = await data.getDBLSubs();
    let str = `There are ${users.length} users currently subscribed to the DBL vote reminder:\n\n`;
    for (const i in users) {
      str += `${i}. ${bot.users.get(users[i]._id).username} - voted: ${users[i].voted}\n`;
    }
    msg.channel.send(str);
  },
  ehelp() {
    return [{ name: '', value: 'get all users that are subscribed to the dbl reminder.' }];
  },
  perm: 'SEND_MESSAGES',
  dev: true,
  admin: true,
  hide: true,
  category: 'Miscellaneous'
};
