import { commandCategories } from '../types/enums';

export const dc: magibotCommand = {
  name: 'dc',
  ehelp: () => ([]),
  main: async (content, msg) => {
    await msg.channel.send('Shutting down...');
    setTimeout(() => {
      process.exit();
    }, 2000);
  },
  admin: true,
  perm: ['SEND_MESSAGES', 'MANAGE_GUILD'],
  hide: true,
  dev: true,
  category: commandCategories.util,
};
