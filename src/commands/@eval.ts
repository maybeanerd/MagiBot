import { commandCategories } from '../types/enums';

export const evall: magibotCommand = {
  name: 'eval',
  ehelp: () => [],
  main: async (content, msg) => {
    msg.channel.send(`input:\n\`\`\`js\n${content}\`\`\``);
    // eslint-disable-next-line no-eval
    const evaluation = await eval(content);
    msg.channel.send(`output:\n\`\`\`js\n${evaluation}\`\`\``);
  },
  admin: true,
  dev: true,
  hide: true,
  perm: 'SEND_MESSAGES',
  category: commandCategories.util,
};
