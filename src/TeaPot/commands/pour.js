module.exports = {
  async main(bot, msg) {
    const mem = await msg.guild.fetchMember(msg.author);
    mem.addRole('460218236185739264').catch(() => { });
    msg.reply('successfully gave you the role.');
  },
  ehelp() {
    return [{ name: '', value: 'Subscribe to MagiBot news and other important pings on this server by getting the <@&460218236185739264> role.' }];
  },
  perm: ['SEND_MESSAGES', 'MANAGE_ROLES'],
  admin: false,
  hide: false,
  category: 'Utility'
};
