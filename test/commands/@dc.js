module.exports = {
  main: (bot, msg) => {
    msg.channel.send('Shutting down...', 'success');
    setTimeout(() => {
      process.exit();
    }, 2000);
  },
  admin: true,
  perm: ['SEND_MESSAGES', 'MANAGE_GUILD'],
  hide: true,
  dev: true,
  category: 'Utility'
};
