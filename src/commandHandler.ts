
// we allow this cycle once, as the help command also needs to list itself
import Discord, { Message } from 'discord.js';
import { help } from './commands/help'; // eslint-disable-line import/no-cycle
import data from './db';
import {
  PREFIXES, OWNERID, DELETE_COMMANDS, userID,
} from './shared_assets';

export const commands:{[k:string]:magibotCommand} = {
  help,
};

function catchError(error:Error, msg:Discord.Message, command:string, bot:Discord.Client) {
  console.error(`Caught:\n${error.stack}\nin command ${command} ${msg.content}`);
  const chann = bot.channels.get('414809410448261132');
  if (chann) {
    (chann as Discord.TextChannel).send(`**Command:** ${command} ${msg.content}\n**Caught Error:**\n\`\`\`${error.stack}\`\`\``);
  }
  msg.reply(`something went wrong while using ${command}. The devs have been automatically notified.
If you can reproduce this, consider using \`${PREFIXES[msg.guild?.id || 0]}.bug <bugreport>\` or join the support discord (link via \`${PREFIXES[msg.guild?.id || 0]}.info\`) to tell us exactly how.`);
}

const userCooldowns = new Set<string>();

// TODO check why the bot also gives us Discord.PartialMessage, as thats not what we want
export async function checkCommand(msg:Discord.Message, bot:Discord.Client) {
  if (!(msg.author && msg.guild && msg.guild.me)) {
    // check for valid message
    console.error('Invalid message received:', msg);
    return;
  }
  if (!(!msg.author.bot && msg.channel.type === 'text')) {
    // check for in guild and text channel
    return;
  }
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
    const myPerms = (msg.channel as Discord.TextChannel).permissionsFor(msg.guild.me);
    if (pre === '.') {
      command = command.slice(1);
      commandVal = command;
    } else if (pre === ':') {
      command = `@${command.slice(1)}`;
      commandVal = command.slice(1);
      // Check if its an admin command
      // if not you're allowed to use the normal version as admin (in any channel)
      if (!commands[command]) {
        command = command.slice(1);
      }
      // Check if the command exists, to not just spam k: msgs
      if (!commands[command]) {
        return;
      }
      if (!(msg.member && (await data.isAdmin(msg.guild.id, msg.member)))) {
        if (myPerms) {
          if (myPerms.has('MANAGE_MESSAGES')) {
            msg.delete();
          }
          if (myPerms.has('SEND_MESSAGES')) {
            msg.reply("you're not allowed to use this command.")
              .then((mess) => (mess as Discord.Message).delete(5000));
          }
        }
        return;
      }
    } else {
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
            || (myPerms && myPerms.has(perms))
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
              catchError(
                err,
                msg,
                `${PREFIXES[msg.guild.id]}${pre}${commandVal}`,
                bot,
              );
            }
            data.usageUp(msg.author.id, msg.guild.id);
          } else if (myPerms && myPerms.has('SEND_MESSAGES')
          ) {
            msg.reply("whoa cool down, you're using commands too quick!");
          }
          // endof cooldown management
        } else if (
          myPerms && myPerms.has('SEND_MESSAGES')
        ) {
          msg.channel.send(
            `I don't have the permissions needed for this command. (${perms}) `,
          );
        }
      } else if (
        myPerms && myPerms.has('SEND_MESSAGES')
      ) {
        if (
          myPerms && myPerms.has('MANAGE_MESSAGES')
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
              PREFIXES[msg.guild.id]
            }:help\` to see how you can change that.`,
          )
          .then((mess) => (mess as Message).delete(15000));
      }
    }
  }

  if (DELETE_COMMANDS) msg.delete();
};
