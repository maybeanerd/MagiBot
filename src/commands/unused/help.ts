import { MessageEmbedOptions } from 'discord.js';
import { PREFIXES, COLOR, user } from '../../shared_assets';
import { commandCategories } from '../../types/enums';
// we allow this cycle once, as the help command also needs to list itself
import { commands } from '../../commandHandler'; // eslint-disable-line import/no-cycle
import { magibotCommand } from '../../types/command';

export const help: magibotCommand = {
  name: 'help',
  category: commandCategories.misc,
  admin: false,
  perm: ['SEND_MESSAGES', 'EMBED_LINKS'],
  main: async function main({ content, message }) {
    if (!message.guild) {
      return;
    }
    const args = content.split(/ +/);
    let command = args[0].toLowerCase();
    // extended help
    if (command) {
      const acommand = `_${command}`;
      if (!(commands[command] || commands[acommand])) {
        message.reply(
          `this command does not exist. Use \`${PREFIXES.get(
            message.guild.id,
          )}.help\` to get a full list of the commands available.`,
        );
      } else if (commands[command]) {
        const info: Array<{
          name: string;
          value: string;
          inline: boolean;
        }> = [];
        let ehelps = commands[command].ehelp(message);
        ehelps.forEach((ehelp) => {
          if (message.guild) {
            info.push({
              name: `${PREFIXES.get(message.guild.id)}.${command} ${
                ehelp.name
              }`,
              value: ehelp.value,
              inline: false,
            });
          }
        });
        let embed: MessageEmbedOptions = {
          color: COLOR,
          description: `Commands available via the prefix \`${PREFIXES.get(
            message.guild.id,
          )}.${command}\`:`,
          fields: info,
          footer: {
            iconURL: user().avatarURL() || '',
            text: '<required input> , [optional input] , choose|one|of|these , (comment on the command)',
          },
        };
        message.channel.send({ embeds: [embed] });
        // admin variant?
        if (
          message.member
          && true // TODO this was once isAdmin
        ) {
          if (commands[acommand]) {
            const inf: Array<{
              name: string;
              value: string;
              inline: boolean;
            }> = [];
            ehelps = commands[acommand].ehelp(message);
            ehelps.forEach((ehelp) => {
              if (message.guild) {
                inf.push({
                  name: `${PREFIXES.get(message.guild.id)}:${acommand.slice(
                    1,
                  )} ${ehelp.name}`,
                  value: ehelp.value,
                  inline: false,
                });
              }
            });
            embed = {
              color: COLOR,
              description: `Admin commands available via the prefix \`${PREFIXES.get(
                message.guild.id,
              )}:${command}\`:`,
              fields: inf,
              footer: {
                iconURL: user().avatarURL() || '',
                text: '<required input> , [optional input] , choose|one|of|these , (comment on the command)',
              },
            };
            message.channel.send({ embeds: [embed] });
          }
        }
      } else if (
        message.member
        && true // TODO this was once isAdmin
      ) {
        // Only Admin command
        command = acommand;
        if (commands[command]) {
          const inf: Array<{
            name: string;
            value: string;
            inline: boolean;
          }> = [];
          const ehelps = commands[command].ehelp(message);
          ehelps.forEach((ehelp) => {
            if (message.guild) {
              inf.push({
                name: `${PREFIXES.get(message.guild.id)}:${command.slice(1)} ${
                  ehelp.name
                }`,
                value: ehelp.value,
                inline: false,
              });
            }
          });
          const embed: MessageEmbedOptions = {
            color: COLOR,
            description: `Admin commands available via the prefix \`${PREFIXES.get(
              message.guild.id,
            )}:${command.slice(1)}\`:`,
            fields: inf,
            footer: {
              iconURL: user().avatarURL() || '',
              text: '<required input> , [optional input] , choose|one|of|these , (comment on the command)',
            },
          };

          message.channel.send({ embeds: [embed] });
        }
      }
    } else {
      // normal help, sort by categories
      const cmds: Array<{ name: string; value: string; inline: boolean }> = [];
      Object.values(commandCategories).forEach((cat) => {
        let coms = '';
        Object.values(commands).forEach((commnd) => {
          if (commnd.category === cat && !(commnd.hide || commnd.admin)) {
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
      let embed: MessageEmbedOptions = {
        color: COLOR,
        description: `Commands available via the prefix \`${PREFIXES.get(
          message.guild.id,
        )}.\` :\nto get more info on a single command use \`${PREFIXES.get(
          message.guild.id,
        )}.help <command>\``,
        fields: cmds,
        footer: {
          iconURL: user().avatarURL() || '',
          text: `admins can override commands with ${PREFIXES.get(
            message.guild.id,
          )}: instead of ${PREFIXES.get(
            message.guild.id,
          )}. to ignore command channel restrictions`,
        },
      };
      message.channel.send({ embeds: [embed] });
      if (
        message.member
        && true // TODO this was once isAdmin
      ) {
        const cmd: Array<{ name: string; value: string; inline: boolean }> = [];
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
          description: `Admin commands available via the prefix \`${PREFIXES.get(
            message.guild.id,
          )}:\` :\nto get more info on a single command use \`${PREFIXES.get(
            message.guild.id,
          )}.help <command>\``,
          fields: cmd,
          footer: {
            iconURL: user().avatarURL() || '',
            text: `admins can override commands with ${PREFIXES.get(
              message.guild.id,
            )}: instead of ${PREFIXES.get(
              message.guild.id,
            )}. to ignore command channel restrictions`,
          },
        };
        message.channel.send({ embeds: [embed] });
      }
    }
  },
  hide: false,
  dev: false,
  ehelp: () => [],
};
