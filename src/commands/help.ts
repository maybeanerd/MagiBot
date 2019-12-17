import { commandCategories } from '../types/enums';
// we allow this cycle once, as the help command also needs to list itself
import { commands } from '../commandHandler'; // eslint-disable-line import/no-cycle

export const help:magibotCommand = {
  category: commandCategories.misc,
  args: '',
  help: 'Shows all available commands',
  admin: false,
  perm: 'SEND_MESSAGES',
  main: async function main(bo, msg) {
    const args = msg.content.split(/ +/);
    let command = args[0].toLowerCase();
    // extended help
    if (command) {
      const acommand = `@${command}`;
      if (!(commands[command] || commands[acommand])) {
        msg.reply(
          `this command does not exist. Use \`${
            bot.PREFIXES[msg.guild.id]
          }.help\` to get a full list of the commands available.`,
        );
      } else if (commands[command]) {
        if (commands[command].ehelp) {
          let info = [];
          let ehelps = commands[command].ehelp(msg, bot);
          for (const i in ehelps) {
            info.push({
              name: `${bot.PREFIXES[msg.guild.id]}.${command} ${ehelps[i].name}`,
              value: ehelps[i].value,
              inline: false,
            });
          }
          let embed = {
            color: bot.COLOR,
            description: `Commands available via the prefix \`${
              bot.PREFIXES[msg.guild.id]
            }.${command}\`:`,
            fields: info,
            footer: {
            /* eslint-disable camelcase */
              icon_url: bot.user.avatarURL,
              /* eslint-enable camelcase */
              text:
              '<required input> , [optional input] , choose|one|of|these , (comment on the command)',
            },
          };

          msg.channel.send('', { embed });
          // admin variant?
          if (msg.member && (await data.isAdmin(msg.guild.id, msg.member, bot))) {
            if (commands[acommand] && commands[acommand].ehelp) {
              info = [];
              ehelps = commands[acommand].ehelp(msg, bot);
              for (const i in ehelps) {
                info.push({
                  name: `${bot.PREFIXES[msg.guild.id]}:${acommand.slice(1)} ${
                    ehelps[i].name
                  }`,
                  value: ehelps[i].value,
                  inline: false,
                });
              }

              embed = {
                color: bot.COLOR,
                description: `Admin commands available via the prefix \`${
                  PREFIXES[msg.guild.id]
                }:${command}\`:`,
                fields: info,
                footer: {
                /* eslint-disable camelcase */
                  icon_url: bot.user.avatarURL,
                  /* eslint-enable camelcase */
                  text:
                  '<required input> , [optional input] , choose|one|of|these , (comment on the command)',
                },
              };

              msg.channel.send('', { embed });
            }
          }
        } else {
          msg.reply('there is no extended help available for this command.');
        }
      } else if (
        msg.member
      && (await data.isAdmin(msg.guild.id, msg.member, bot))
      ) {
      // Only Admin command
        command = acommand;
        if (commands[command].ehelp) {
          const info = [];
          const ehelps = commands[command].ehelp(msg, bot);
          for (const i in ehelps) {
            info.push({
              name: `${bot.PREFIXES[msg.guild.id]}:${command.slice(1)} ${
                ehelps[i].name
              }`,
              value: ehelps[i].value,
              inline: false,
            });
          }
          const embed = {
            color: bot.COLOR,
            description: `Admin commands available via the prefix \`${
              bot.PREFIXES[msg.guild.id]
            }:${command.slice(1)}\`:`,
            fields: info,
            footer: {
            /* eslint-disable camelcase */
              icon_url: bot.user.avatarURL,
              /* eslint-enable camelcase */
              text:
              '<required input> , [optional input] , choose|one|of|these , (comment on the command)',
            },
          };

          msg.channel.send('', { embed });
        } else {
          msg.reply('there is no extended help available for this command.');
        }
      }
    } else {
    // normal help, sort by categories
      let cmds = [];
      for (const i in commandCategories) {
        const cat = commandCategories[i];
        let coms = '';
        for (const commnd in commands) {
          if (
            commands[commnd].category == cat
          && !(commands[commnd].hide || commands[commnd].admin)
          ) {
            let nm = commnd;
            if (commands[commnd].dev) {
              nm += '(dev only)';
            }
            coms += `${nm}, `;
          }
        }
        if (coms != '') {
          coms = coms.slice(0, -2);
          cmds.push({
            name: `${cat} commands`,
            value: coms,
            inline: false,
          });
        }
      }
      let embed = {
        color: bot.COLOR,
        description: `Commands available via the prefix \`${
          bot.PREFIXES[msg.guild.id]
        }.\` :\nto get more info on a single command use \`${
          bot.PREFIXES[msg.guild.id]
        }.help <command>\``,
        fields: cmds,
        footer: {
        /* eslint-disable camelcase */
          icon_url: bot.user.avatarURL,
          /* eslint-enable camelcase */
          text: `admins can override commands with ${
            bot.PREFIXES[msg.guild.id]
          }: instead of ${
            bot.PREFIXES[msg.guild.id]
          }. to ignore command channel restrictions`,
        },
      };
      msg.channel.send('', { embed });
      if (msg.member && (await data.isAdmin(msg.guild.id, msg.member, bot))) {
        cmds = [];
        let coms = '';
        for (const commnd in commands) {
          if (commands[commnd].admin && !commands[commnd].hide) {
            let nm = commnd.substr(1, commnd.length);
            if (commands[commnd].dev) {
              nm += '(dev only)';
            }
            coms += `${nm}, `;
          }
        }
        if (coms != '') {
          coms = coms.slice(0, -2);
          cmds.push({
            name: 'Admin commands',
            value: coms,
            inline: false,
          });
        }
        embed = {
          color: bot.COLOR,
          description: `Admin commands available via the prefix \`${
            bot.PREFIXES[msg.guild.id]
          }:\` :\nto get more info on a single command use \`${
            bot.PREFIXES[msg.guild.id]
          }.help <command>\``,
          fields: cmds,
          footer: {
          /* eslint-disable camelcase */
            icon_url: bot.user.avatarURL,
            /* eslint-enable camelcase */
            text: `admins can override commands with ${
              bot.PREFIXES[msg.guild.id]
            }: instead of ${
              bot.PREFIXES[msg.guild.id]
            }. to ignore command channel restrictions`,
          },
        };
        msg.channel.send('', { embed });
      }
    }
  },
};
