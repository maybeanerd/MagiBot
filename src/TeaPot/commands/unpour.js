module.exports = {
  async main(bot, msg) {
    const mem = await msg.guild.fetchMember(msg.author);
    mem.removeRole('460218236185739264').catch(() => { });
    msg.reply('successfully removed the role.');
  },
  ehelp() {
    return [{ name: '', value: 'Get rid of your <@&460218236185739264> role.' }];
  },
  perm: ['SEND_MESSAGES', 'MANAGE_ROLES'],
  admin: false,
  hide: false,
  category: 'Utility'
};
