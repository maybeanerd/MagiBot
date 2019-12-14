module.exports = {
  async main(bot, msg) {
    // TODO check if invite activated on server
    // TODO let user define invite length
    const invite = await msg.channel.createInvite({}, 'member used invite command');
    msg.channel.send(`Here's an invite link to this channel: ${invite}`);
  },
  ehelp() {
    return [{ name: '', value: 'Create and get an invite link to the guild.' }];
  },
  perm: ['SEND_MESSAGES', 'CREATE_INSTANT_INVITE'],
  admin: false,
  category: 'Utility'
};
