import Discord, { GuildMember, Message } from 'discord.js';
// eslint-disable-next-line import/no-cycle
import { statcord } from './bot';
import { vote } from './commands/vote';
import { sound } from './commands/sound';
import { rfact } from './commands/rfact';
// eslint-disable-next-line import/no-cycle
import { stats } from './commands/stats';
import { salt } from './commands/salt';
// eslint-disable-next-line import/no-cycle
import { bug } from './commands/bug';
import { inf as info } from './commands/info';
import { inv as invite } from './commands/invite';
import { ping } from './commands/ping';
import { profile } from './commands/profile';
import { roll } from './commands/roll';
import { dc as _dc } from './commands/@dc';
import { evall as _eval } from './commands/@eval';
// eslint-disable-next-line import/no-cycle
import { queue as _queue } from './commands/@queue';
import { salt as _salt } from './commands/@salt';
import { sound as _sound } from './commands/@sound';
import { setup as _setup } from './commands/@setup';
// eslint-disable-next-line import/no-cycle
import { update as _update } from './commands/@update';
// we allow this cycle once, as the help command also needs to list itself
import { help } from './commands/help'; // eslint-disable-line import/no-cycle

import {
  PREFIXES, OWNERID, DELETE_COMMANDS, user,
} from './shared_assets';
// eslint-disable-next-line import/no-cycle
import { catchErrorOnDiscord } from './sendToMyDiscord';
import { magibotCommand } from './types/magibot';
import { getAdminRoles, isBlacklistedUser, getCommandChannel } from './db';

export const commands: { [k: string]: magibotCommand } = {
  _dc,
  _eval,
  _queue,
  _sound,
  _setup,
  _update,
  _salt,
  help,
  salt,
  stats,
  rfact,
  sound,
  vote,
  bug,
  info,
  invite,
  ping,
  profile,
  roll,
};

async function catchError(error: Error, msg: Discord.Message, command: string) {
  console.error(
    `Caught:\n${error.stack}\nin command ${command} ${msg.content}`,
  );
  await catchErrorOnDiscord(
    `**Command:** ${command} ${msg.content}\n**Caught Error:**\n\`\`\`${error.stack}\`\`\``,
  );

  msg.reply(`something went wrong while using ${command}. The devs have been automatically notified.
If you can reproduce this, consider using \`${
  PREFIXES[msg.guild ? msg.guild.id : 0]
}.bug <bugreport>\` or join the support discord (link via \`${
  PREFIXES[msg.guild ? msg.guild.id : 0]
}.info\`) to tell us exactly how.`);
}

async function isAdmin(guildID: string, member: GuildMember) {
  // checks for admin and Owner, they can always use
  if (
    member.hasPermission('ADMINISTRATOR', {
      checkAdmin: true,
      checkOwner: true,
    })
  ) {
    return true;
  }
  // Owner of bot is always admin hehe
  if (member.id === OWNERID) {
    return true;
  }
  const roles = await getAdminRoles(guildID);
  let ret = false;
  roles.forEach((role) => {
    if (member.roles.cache.has(role)) {
      ret = true;
    }
  });
  return ret;
}

async function commandAllowed(guildID: string, cid: string) {
  const channels = await getCommandChannel(guildID);
  return channels.length === 0 || channels.includes(cid);
};

const userCooldowns = new Set<string>();

export async function checkCommand(msg: Discord.Message) {
  if (!(msg.author && msg.guild && msg.guild.me)) {
    // check for valid message
    console.error('Invalid message received:', msg);
    return;
  }
  if (!(!msg.author.bot && msg.channel.type === 'text')) {
    // check for in guild and text channel
    return;
  }
  let isMention: boolean;
  if (
    msg.content.startsWith(`<@${user().id}>`)
    || msg.content.startsWith(`<@!${user().id}>`)
  ) {
    isMention = true;
  } else if (msg.content.startsWith(PREFIXES[msg.guild.id])) {
    isMention = false;
  } else {
    return;
  }
  // ignore blacklisted users
  if (await isBlacklistedUser(msg.author.id, msg.guild.id)) {
    // we dont delete the message because this would delete everything that starts with the prefix
    /*     msg.delete(); */
    return;
  }
  let command: string;
  let content: string;
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
    // delete prefix and command
    content = msg.content.slice(command.length + PREFIXES[msg.guild.id].length);
    content = content.replace(/^\s+/g, ''); // delete leading spaces
  }
  if (command) {
    let commandVal: string;
    const pre = command.charAt(0);
    const myPerms = (msg.channel as Discord.TextChannel).permissionsFor(
      msg.guild.me,
    );
    if (pre === '.') {
      command = command.slice(1);
      commandVal = command;
    } else if (pre === ':') {
      command = `_${command.slice(1)}`;
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
      if (!(msg.member && (await isAdmin(msg.guild.id, msg.member)))) {
        if (myPerms) {
          if (myPerms.has('MANAGE_MESSAGES')) {
            msg.delete();
          }
          if (myPerms.has('SEND_MESSAGES')) {
            msg
              .reply("you're not allowed to use this command.")
              .then((mess) => (mess as Discord.Message).delete({ timeout: 5000 }));
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
        || (await commandAllowed(msg.guild.id, msg.channel.id))
      ) {
        const perms = commands[command].perm;
        if (!perms || (myPerms && myPerms.has(perms))) {
          // cooldown for command usage
          if (!userCooldowns.has(msg.author.id)) {
            userCooldowns.add(msg.author.id);
            setTimeout(() => {
              userCooldowns.delete(msg.author.id);
            }, 4000);
            try {
              statcord.postCommand(command, msg.author.id);
              await commands[command].main(content, msg);
            } catch (err) {
              catchError(
                err,
                msg,
                `${PREFIXES[msg.guild.id]}${pre}${commandVal}`,
              );
            }
            data.usageUp(msg.author.id, msg.guild.id);
          } else if (myPerms && myPerms.has('SEND_MESSAGES')) {
            msg.reply("whoa cool down, you're using commands too quick!");
          }
          // endof cooldown management
        } else if (myPerms && myPerms.has('SEND_MESSAGES')) {
          msg.channel.send(
            `I don't have the permissions needed for this command. (${perms}) `,
          );
        }
      } else if (myPerms && myPerms.has('SEND_MESSAGES')) {
        if (myPerms && myPerms.has('MANAGE_MESSAGES')) {
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
          .then((mess) => (mess as Message).delete({ timeout: 15000 }));
      }
    }
  }

  if (DELETE_COMMANDS) msg.delete();
}
