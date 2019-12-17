
// we allow this cycle once, as the help command also needs to list itself
import { help } from './commands/help'; // eslint-disable-line import/no-cycle

export const commands:{[k:string]:magibotCommand} = {
  help,
};

const userCooldowns = new Set();

export async function checkCommand(msg, isMention) {
  try {
    // ignore blacklisted users
    if (await data.isBlacklistedUser(await msg.author.id, await msg.guild.id)) {
      msg.delete();
      return;
    }
    let command;
    if (isMention) {
      command = msg.content.split(' ')[1];
      msg.content = msg.content
        .split(' ')
        .splice(2, msg.content.split(' ').length)
        .join(' ');
      command = `.${command}`;
    } else {
      command = msg.content
        .substring(bot.PREFIXES[msg.guild.id].length, msg.content.length)
        .split(' ')[0]
        .toLowerCase();
      msg.content = msg.content.slice(
        command.length + bot.PREFIXES[msg.guild.id].length,
      ); // delete prefix and command
      msg.content = msg.content.replace(/^\s+/g, ''); // delete leading spaces
    }
    if (command) {
      let commandVal;
      const pre = command.charAt(0);
      switch (pre) {
      case '.':
        command = command.slice(1);
        commandVal = command;
        break;
      case ':':
        command = `@${command.slice(1)}`;
        commandVal = command.slice(1);
        // Check if its an admin command, if not you're allowed to use the normal version as admin (in any channel)
        if (!commands[command]) {
          command = command.slice(1);
        }
        // Check if the command exists, to not just spam k: messages
        if (commands[command]) {
          if (
            !(
              msg.member
                && (await data.isAdmin(msg.guild.id, msg.member, bot))
            )
          ) {
            if (
              await msg.channel
                .permissionsFor(msg.guild.me)
                .has('MANAGE_MESSAGES')
            ) {
              msg.delete();
            }
            if (
              await msg.channel
                .permissionsFor(msg.guild.me)
                .has('SEND_MESSAGES')
            ) {
              msg
                .reply("you're not allowed to use this command.")
                .then((mess) => mess.delete(5000));
            }
            return;
          }
        } else {
          return;
        }
        break;
      default:
        return;
      }
      if (
        commands[command]
        && (!commands[command].dev || msg.author.id == bot.OWNERID)
      ) {
        if (
          pre == ':'
          || (await data.commandAllowed(msg.guild.id, msg.channel.id))
        ) {
          const perms = commands[command].perm;
          if (
            !perms
            || (await msg.channel.permissionsFor(msg.guild.me).has(perms))
          ) {
            // cooldown for command usage
            if (!userCooldowns.has(msg.author.id)) {
              userCooldowns.add(msg.author.id);
              setTimeout(() => {
                userCooldowns.delete(msg.author.id);
              }, 4000);
              try {
                await commands[command].main(bot, msg);
              } catch (err) {
                bamands.catchError(
                  err,
                  bot,
                  msg,
                  `${bot.PREFIXES[msg.guild.id]}${pre}${commandVal}`,
                );
              }
              data.usageUp(msg.author.id, msg.guild.id);
            } else if (
              await msg.channel
                .permissionsFor(msg.guild.me)
                .has('SEND_MESSAGES')
            ) {
              msg.reply("whoa cool down, you're using commands too quick!");
            }
            // endof cooldown management
          } else if (
            await msg.channel.permissionsFor(msg.guild.me).has('SEND_MESSAGES')
          ) {
            msg.channel.send(
              `I don't have the permissions needed for this command. (${perms}) `,
            );
          }
        } else if (
          await msg.channel.permissionsFor(msg.guild.me).has('SEND_MESSAGES')
        ) {
          if (
            await msg.channel
              .permissionsFor(msg.guild.me)
              .has('MANAGE_MESSAGES')
          ) {
            msg.delete();
          }
          msg
            .reply(
              `commands aren't allowed in <#${
                msg.channel.id
              }>. Use them in ${await data.commandChannel(
                msg.guild.id,
              )}. If you're an admin use \`${
                bot.PREFIX
              }:help\` to see how you can change that.`,
            )
            .then((mess) => mess.delete(15000));
        }
      }
    }
  } catch (err) {
    bamands.catchErrorOnDiscord(bot, `in check command: ${err}`);
  }
};
