import si from 'systeminformation';
import { commandCategories } from '../types/enums';
import { OWNERID, COLOR, SIGN } from '../shared_assets';
import { bot } from '../bot';

export const stats: magibotCommand = {
  name: 'stats',
  main: async (content, msg) => {
    const info:Array<{name:string, value:string|number, inline:boolean}> = [];
    const guilds = bot.guilds.array();

    info.push({
      name: 'Number of guilds currently being served',
      value: guilds.length,
      inline: false,
    });
    info.push({
      name: 'Number of users currently being served',
      value: bot.users.size,
      inline: false,
    });


    // uptime calc
    const u = bot.uptime;
    let uptime = '';
    // days
    let x = Math.floor(u / 3600000 / 24);
    if (x > 0) {
      uptime += `${x}d : `;
    }
    // hours
    x = Math.floor(u / 3600000) % 24;
    if (x > 0) {
      uptime += `${x}h : `;
    }
    // mins
    x = Math.floor(u / 60000) % 60;
    if (x > 0) {
      uptime += `${x}m : `;
    }
    // secs
    x = Math.floor(u / 1000) % 60;
    if (x > 0) {
      uptime += `${x}s`;
    }
    // enbettung in ausgabe
    info.push({
      name: 'Time since last restart',
      value: uptime,
      inline: false,
    });
    if (msg.author.id === OWNERID) {
      const memInfo = await si.mem();
      const memUsedByProccess = process.memoryUsage().rss;
      info.push({
        name: 'Memory usage:',
        value: `Memory used by this: ${Math.round(memUsedByProccess / 1048576)} MB (${Math.round((memUsedByProccess / memInfo.used) * 100)}% of used memory)
        Total available memory: ${Math.round(memInfo.total / 1048576)} MB
        Used memory: ${Math.round(memInfo.used / 1048576)} MB (${Math.round((memInfo.used / memInfo.total) * 100)}%)`,
        inline: false,
      });
    }

    const embed = {
      color: COLOR,
      description: 'Here are some stats:',
      fields: info,
      footer: {
        /* eslint-disable camelcase */
        icon_url: bot.user.avatarURL,
        /* eslint-enable camelcase */
        text: SIGN,
      },
    };

    msg.channel.send({ embed });
  },
  ehelp() {
    return [{ name: '', value: 'Get some stats from the bot.' }];
  },
  perm: 'SEND_MESSAGES',
  admin: false,
  hide: false,
  category: commandCategories.misc,
  dev: false,
};
