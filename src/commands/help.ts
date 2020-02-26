import { PREFIXES, COLOR, user } from '../shared_assets';
import { commandCategories } from '../types/enums';
// we allow this cycle once, as the help command also needs to list itself
import { commands } from '../commandHandler'; // eslint-disable-line import/no-cycle
import data from '../db';

export const help:magibotCommand = {
  name: 'help',
  category: commandCategories.misc,
  help: 'Shows all available commands',
  admin: false,
  perm: 'SEND_MESSAGES',
  main: async function main(content, msg) {
    const args = msg.content.split(/ +/);
    let command = args[0].toLowerCase();
    // extended help
    if (command) {
      const acommand = `@${command}`;
      if (!(commands[command] || commands[acommand])) {
        msg.reply(
          `this command does not exist. Use \`${
            PREFIXES[msg.guild.id]
          }.help\` to get a full list of the commands available.`,
        );
      } else if (commands[command]) {
        if (commands[command].ehelp) {
          const info:Array<{name:string, value:string, inline:boolean}> = [];
          let ehelps = commands[command].ehelp(msg);
          ehelps.forEach((ehelp) => {
            info.push({
              name: `${PREFIXES[msg.guild.id]}.${command} ${ehelp.name}`,
              value: ehelp.value,
              inline: false,
            });
          });
          let embed = {
            color: COLOR,
            description: `Commands available via the prefix \`${
              PREFIXES[msg.guild.id]
            }.${command}\`:`,
            fields: info,
            footer: {
            /* eslint-disable camelcase */
              icon_url: user().avatarURL,
              /* eslint-enable camelcase */
              text:
              '<required input> , [optional input] , choose|one|of|these , (comment on the command)',
            },
          };
          msg.channel.send('', { embed });
          // admin variant?
          if (msg.member && (await data.isAdmin(msg.guild.id, msg.member))) {
            if (commands[acommand] && commands[acommand].ehelp) {
              const inf:Array<{name:string, value:string, inline:boolean}> = [];
              ehelps = commands[acommand].ehelp(msg);
              ehelps.forEach((ehelp) => {
                inf.push({
                  name: `${PREFIXES[msg.guild.id]}:${acommand.slice(1)} ${
                    ehelp.name
                  }`,
                  value: ehelp.value,
                  inline: false,
                });
              });
              embed = {
                color: COLOR,
                description: `Admin commands available via the prefix \`${
                  PREFIXES[msg.guild.id]
                }:${command}\`:`,
                fields: inf,
                footer: {
                /* eslint-disable camelcase */
                  icon_url: user().avatarURL,
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
      && (await data.isAdmin(msg.guild.id, msg.member))
      ) {
      // Only Admin command
        command = acommand;
        if (commands[command].ehelp) {
          const inf:Array<{name:string, value:string, inline:boolean}> = [];
          const ehelps = commands[command].ehelp(msg);
          ehelps.forEach((ehelp) => {
            inf.push({
              name: `${PREFIXES[msg.guild.id]}:${command.slice(1)} ${
                ehelp.name
              }`,
              value: ehelp.value,
              inline: false,
            });
          });
          const embed = {
            color: COLOR,
            description: `Admin commands available via the prefix \`${
              PREFIXES[msg.guild.id]
            }:${command.slice(1)}\`:`,
            fields: inf,
            footer: {
            /* eslint-disable camelcase */
              icon_url: user().avatarURL,
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
      const cmds:Array<{name:string, value:string, inline:boolean}> = [];
      Object.values(commandCategories).forEach((cat) => {
        let coms = '';
        Object.values(commands).forEach((commnd) => {
          if (
            commnd.category === cat
          && !(commnd.hide || commnd.admin)
          ) {
            let nm = commnd.name;
            if (commnd.dev) {
              nm += '(dev only)';
            }
            coms += `${nm}, `;
          }
        });
        if (coms !== '') {
          coms = coms.slice(0, -2);
          cmds.push({
            name: `${cat} commands`,
            value: coms,
            inline: false,
          });
        }
      });
      let embed = {
        color: COLOR,
        description: `Commands available via the prefix \`${
          PREFIXES[msg.guild.id]
        }.\` :\nto get more info on a single command use \`${
          PREFIXES[msg.guild.id]
        }.help <command>\``,
        fields: cmds,
        footer: {
        /* eslint-disable camelcase */
          icon_url: user().avatarURL,
          /* eslint-enable camelcase */
          text: `admins can override commands with ${
            PREFIXES[msg.guild.id]
          }: instead of ${
            PREFIXES[msg.guild.id]
          }. to ignore command channel restrictions`,
        },
      };
      msg.channel.send('', { embed });
      if (msg.member && (await data.isAdmin(msg.guild.id, msg.member))) {
        const cmd:Array<{name:string, value:string, inline:boolean}> = [];
        let coms = '';
        Object.values(commands).forEach((commnd) => {
          if (commnd.admin && !commnd.hide) {
            let nm = commnd.name;
            if (commnd.dev) {
              nm += '(dev only)';
            }
            coms += `${nm}, `;
          }
        });
        if (coms !== '') {
          coms = coms.slice(0, -2);
          cmd.push({
            name: 'Admin commands',
            value: coms,
            inline: false,
          });
        }
        embed = {
          color: COLOR,
          description: `Admin commands available via the prefix \`${
            PREFIXES[msg.guild.id]
          }:\` :\nto get more info on a single command use \`${
            PREFIXES[msg.guild.id]
          }.help <command>\``,
          fields: cmd,
          footer: {
          /* eslint-disable camelcase */
            icon_url: user().avatarURL,
            /* eslint-enable camelcase */
            text: `admins can override commands with ${
              PREFIXES[msg.guild.id]
            }: instead of ${
              PREFIXES[msg.guild.id]
            }. to ignore command channel restrictions`,
          },
        };
        msg.channel.send('', { embed });
      }
    }
  },
  hide: false,
  dev: false,
  ehelp: () => [],
};
