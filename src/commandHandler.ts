
// we allow this cycle once, as the help command also needs to list itself
import Discord from 'discord.js';
import { help } from './commands/help'; // eslint-disable-line import/no-cycle
import data from './db';
import {
  PREFIXES, OWNERID, DELETE_COMMANDS, userID,
} from './shared_assets';


export const commands:{[k:string]:magibotCommand} = {
  help,
};

const userCooldowns = new Set();

export async function checkCommand(msg:Discord.Message) {
  if (!msg.author.bot && msg.channel.type === 'text') {
    let isMention:boolean;
    if (
      msg.content.startsWith(`<@${userID()}>`)
      || msg.content.startsWith(`<@!${userID()}>`)
    ) {
      isMention = true;
    } else if (msg.content.startsWith(PREFIXES[msg.guild.id])) {
      isMention = false;
    } else {
      return;
    }

    // ignore blacklisted users
    if (await data.isBlacklistedUser(msg.author.id, msg.guild.id)) {
      msg.delete();
      return;
    }
    let command:string;
    let content:string;
    if (isMention) {
      command = msg.content.split(' ')[1]; // eslint-disable-line prefer-destructuring
      content = msg.content
        .split(' ')
        .splice(2, msg.content.split(' ').length)
        .join(' ');
      command = `.${command}`;
    } else {
      command = msg.content
        .substring(PREFIXES[msg.guild.id].length, msg.content.length)
        .split(' ')[0]
        .toLowerCase();
      content = msg.content.slice(
        command.length + PREFIXES[msg.guild.id].length,
      ); // delete prefix and command
      content = msg.content.replace(/^\s+/g, ''); // delete leading spaces
    }
    if (command) {
      let commandVal:string;
      const pre = command.charAt(0);
      switch (pre) {
      case '.':
        command = command.slice(1);
        commandVal = command;
        break;
      case ':':
        command = `@${command.slice(1)}`;
        commandVal = command.slice(1);
        // Check if its an admin command
        // if not you're allowed to use the normal version as admin (in any channel)
        if (!commands[command]) {
          command = command.slice(1);
        }
        // Check if the command exists, to not just spam k: msgs
        if (commands[command]) {
          if (
            !(
              msg.member
                && (await data.isAdmin(msg.guild.id, msg.member))
            )
          ) {
            if (
              (msg.channel as Discord.TextChannel)
                .permissionsFor(msg.guild.me)
                .has('MANAGE_MESSAGES')
            ) {
              msg.delete();
            }
            if (
              (msg.channel as Discord.TextChannel)
                .permissionsFor(msg.guild.me)
                .has('SEND_MESSAGES')
            ) {
              msg
                .reply("you're not allowed to use this command.")
                .then((mess) => (mess as Discord.Message).delete(5000));
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
        && (!commands[command].dev || msg.author.id === OWNERID)
      ) {
        if (
          pre === ':'
          || (await data.commandAllowed(msg.guild.id, msg.channel.id))
        ) {
          const perms = commands[command].perm;
          if (
            !perms
            || (msg.channel as Discord.TextChannel).permissionsFor(msg.guild.me).has(perms)
          ) {
            // cooldown for command usage
            if (!userCooldowns.has(msg.author.id)) {
              userCooldowns.add(msg.author.id);
              setTimeout(() => {
                userCooldowns.delete(msg.author.id);
              }, 4000);
              try {
                await commands[command].main(content, msg);
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
                .has('SEND_msgS')
            ) {
              msg.reply("whoa cool down, you're using commands too quick!");
            }
            // endof cooldown management
          } else if (
            await msg.channel.permissionsFor(msg.guild.me).has('SEND_msgS')
          ) {
            msg.channel.send(
              `I don't have the permissions needed for this command. (${perms}) `,
            );
          }
        } else if (
          await msg.channel.permissionsFor(msg.guild.me).has('SEND_msgS')
        ) {
          if (
            await msg.channel
              .permissionsFor(msg.guild.me)
              .has('MANAGE_msgS')
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

    if (DELETE_COMMANDS) msg.delete();
  }
};
