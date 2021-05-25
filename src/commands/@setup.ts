import { MessageEmbedOptions } from 'discord.js';
import { COLOR, PREFIXES } from '../shared_assets';

import data from '../db';
import { findMember, yesOrNo, findRole } from '../bamands';
import { commandCategories } from '../types/enums';
import { magibotCommand } from '../types/magibot';

function printHelp() {
  const info: Array<{ name: string; value: string }> = [];

  info.push({
    name: 'ban <@User>',
    value: 'Deactivate all functions of the bot for a user',
  });
  info.push({
    name: 'unban <@User>',
    value: 'Reactivate all functions of the bot for a user',
  });
  info.push({
    name: 'join',
    value: "(De)activate joinsounds for the voicechannel you're connected to",
  });
  info.push({
    name: 'admin <@Role>',
    value: '(Un)set a role to be considered admin by the bot',
  });
  info.push({
    name: 'command',
    value:
      "(De)activate bot commands for the text channel you're sending this in",
  });
  info.push({
    name: 'notification',
    value: '(Un)set a textchannel to be notification channel',
  });
  info.push({
    name: 'info',
    value: 'Displays current settings',
  });
  info.push({
    name: 'prefix <prefix>',
    value: 'Set a custom character or string as prefix',
  });

  return info;
}

export const setup: magibotCommand = {
  dev: false,
  name: 'setup',
  main: async function main(content, msg) {
    const args = content.split(/ +/);
    const command = args[0].toLowerCase();

    const mention = args[1];

    // Create variables to use in cases
    let uid;
    let de;
    switch (command) {
    case 'ban':
      uid = await findMember(msg.guild!, mention);
      if (mention && uid) {
        if (
          await yesOrNo(
            msg,
            `Do you really want to ban <@!${uid}> from using the bot?`,
            'Successfully canceled ban.',
          )
        ) {
          data.setBlacklistedUser(msg.guild!.id, uid, true);
          msg.channel.send(
            `Successfully banned <@!${uid}> from using the bot.`,
          );
        }
      } else {
        msg.reply('you need to mention a user you want to use this on!');
      }
      break;
    case 'unban':
      uid = await findMember(msg.guild!, mention);
      if (mention && uid) {
        if (
          await yesOrNo(
            msg,
            `Do you really want to reactivate bot usage for <@!${uid}>?`,
            'Successfully canceled unban.',
          )
        ) {
          data.setBlacklistedUser(msg.guild!.id, uid, false);
          msg.channel.send(
            `Successfully banned <@!${uid}> from using the bot.`,
          );
        }
      } else {
        msg.reply('you need to mention a user you want to use this on!');
      }
      break;
    case 'join':
      // eslint-disable-next-line no-case-declarations
      if (msg.member) {
        const voiceChannel = msg.member.voice.channel;
        if (voiceChannel) {
          const isJoinable = await data.isJoinable(
              msg.guild!.id,
              voiceChannel.id,
          );
          de = '';
          if (isJoinable) {
            de = 'de';
          }
          if (
            await yesOrNo(
              msg,
              `Do you want to ${de}activate joinsounds in **${voiceChannel.name}**?`,
              `Cancelled ${de}activating joinsounds in **${voiceChannel.name}**.`,
            )
          ) {
            await data.setJoinable(
                msg.guild!.id,
                voiceChannel.id,
                !isJoinable,
            );
            msg.channel.send(
              `Successfully ${de}activated joinsounds in **${voiceChannel.name}**.`,
            );
          }
        } else {
          msg.channel.send("You're connected to no voice channel!");
        }
      }
      break;
    case 'admin':
      if (mention === '@everyone') {
        msg.channel.send('You cannot use the everyone role as admin');
        break;
      }
      // eslint-disable-next-line no-case-declarations
      const rid = await findRole(msg.guild!, mention);
      if (mention && rid) {
        if (!(await data.isAdminRole(msg.guild!.id, rid))) {
          if (
            await yesOrNo(
              msg,
              `Do you want to set <@&${rid}> as admin role?`,
              `Cancelled setting <@&${rid}> as admin role`,
            )
          ) {
            await data.setAdmin(msg.guild!.id, rid, true);
            msg.channel.send(`Successfully set <@&${rid}> as admin role!`);
          }
        } else if (
          await yesOrNo(
            msg,
            `Do you want to remove <@&${rid}> from the admin roles?`,
            `Cancelled removing <@&${rid}> from the admin roles`,
          )
        ) {
          await data.setAdmin(msg.guild!.id, rid, false);
          msg.channel.send(
            `Successfully removed <@&${rid}> from the admin roles!`,
          );
        }
      } else {
        msg.channel.send('You need to mention a role!');
      }
      break;
    case 'command':
      // eslint-disable-next-line no-case-declarations
      const isCommandChannel = await data.isCommandChannel(
          msg.guild!.id,
          msg.channel.id,
      );
      de = '';
      if (isCommandChannel) {
        de = 'de';
      }
      if (
        await yesOrNo(
          msg,
          `Do you want to ${de}activate commands in <#${msg.channel.id}>?`,
          `Cancelled ${de}activating commands in <#${msg.channel.id}>`,
        )
      ) {
        await data.setCommandChannel(
            msg.guild!.id,
            msg.channel.id,
            !isCommandChannel,
        );
        msg.channel.send(
          `Successfully ${de}activated commands in <#${msg.channel.id}>.`,
        );
      }
      break;
    case 'notification':
      // eslint-disable-next-line no-case-declarations
      const isNotChann = await data.isNotChannel(
          msg.guild!.id,
          msg.channel.id,
      );
      if (!isNotChann) {
        if (
          await yesOrNo(
            msg,
            `Do you want to activate MagiBot notifications in <#${msg.channel.id}>?`,
            `Cancelled activating notifications in <#${msg.channel.id}>`,
          )
        ) {
          await data.setNotification(msg.guild!.id, msg.channel.id);
          msg.channel
            .send(
              `Successfully activated notifications in <#${msg.channel.id}>.`,
            )
            .then((mess) => {
              mess.delete({ timeout: 5000 }).catch(() => {});
              msg.delete();
            });
        }
      } else if (
        await yesOrNo(
          msg,
          `Do you want to deactivate MagiBot notifications in <#${msg.channel.id}>?`,
          `Cancelled deactivating notifications in <#${msg.channel.id}>`,
        )
      ) {
        await data.setNotification(msg.guild!.id, false);
        msg.channel.send('Successfully deactivated notifications.');
      }
      break;
    case 'prefix':
      if (mention) {
        if (
          await yesOrNo(
            msg,
            `Do you want to change the prefix in ${msg.guild!.name} from \`${
              PREFIXES[msg.guild!.id]
            }.\` to \`${mention}.\` ?`,
            'Cancelled changing the prefix.',
          )
        ) {
          const newpref = await data.setPrefixE(msg.guild!.id, mention);
          if (newpref) {
            msg.channel.send(
              `Successfully changed prefix to \`${newpref}.\` !`,
            );
          } else {
            msg.channel.send('Something bad happened...');
          }
        }
      } else {
        msg.reply('you need to provide a prefix you want to use.');
      }
      break;
    case 'info':
      /* eslint-disable no-case-declarations */
      const info: Array<{
          name: string;
          value: string;
          inline: boolean;
        }> = [];
      const set = await data.getSettings(msg.guild!.id);

      info.push({
        name: 'Prefix',
        value: `${await data.getPrefixE(msg.guild!.id)}.`,
        inline: false,
      });

      let str = '';
      let cmd = set.commandChannels;
      /* eslint-enable no-case-declarations */

      if (!cmd.toString()) {
        str = 'no whitelist, so every channel is allowed';
      } else {
        cmd.forEach((com) => {
          str += `<#${com}> `;
        });
      }
      info.push({
        name: 'Command channels',
        value: str,
        inline: false,
      });

      str = '';
      cmd = set.adminRoles;
      if (!cmd.toString()) {
        str = 'Empty';
      } else {
        cmd.forEach((com) => {
          str += `<@&${com}> `;
        });
      }
      info.push({
        name: 'Admin roles',
        value: str,
        inline: false,
      });

      str = '';
      cmd = set.joinChannels;
      if (!cmd.toString()) {
        str = 'Empty';
      } else {
        const { guild } = msg;
        cmd.forEach((com) => {
          const chann = guild!.channels.cache.get(com);
          if (chann) {
            str += `${chann.name}, `;
          } else {
            data.setJoinable(guild!.id, com, false);
          }
        });
        str = str.substring(0, str.length - 2);
      }
      info.push({
        name: 'Joinsound channels',
        value: str,
        inline: false,
      });

      str = '';
      cmd = set.blacklistedUsers;
      if (!cmd.toString()) {
        str = 'Empty';
      } else {
        cmd.forEach((com) => {
          str += `<@!${com}>, `;
        });
        str = str.substring(0, str.length - 2);
      }
      info.push({
        name: 'Blacklisted users',
        value: str,
        inline: false,
      });

      str = '';
      cmd = set.blacklistedEveryone;
      if (!cmd.toString()) {
        str = 'Empty';
      } else {
        cmd.forEach((com) => {
          str += `<#${com}>, `;
        });
        str = str.substring(0, str.length - 2);
      }
      info.push({
        name: 'Channel with @everyone blacklist',
        value: str,
        inline: false,
      });

      if (!set.saltKing) {
        str = 'None';
      } else {
        str = `<@${set.saltKing}>`;
      }
      info.push({
        name: 'SaltKing',
        value: str,
        inline: false,
      });
      if (!set.saltRole) {
        str = 'None';
      } else {
        str = `<@&${set.saltRole}>`;
      }
      info.push({
        name: 'SaltKing role',
        value: str,
        inline: false,
      });
      if (!set.notChannel) {
        str = 'None';
      } else {
        str = `<#${set.notChannel}>`;
      }
      info.push({
        name: 'Notification channel',
        value: str,
        inline: false,
      });
      /* eslint-disable no-case-declarations */
      /* eslint-disable camelcase */
      const embed: MessageEmbedOptions = {
        color: COLOR,
        description: `Guild settings of ${msg.guild!.name}:`,
        fields: info,
        footer: {
          iconURL: msg.guild!.iconURL() || '',
          text: msg.guild!.name,
        },
      };
        /* eslint-enable no-case-declarations */
        /* eslint-enable camelcase */
      msg.channel.send('', { embed });
      break;
    default:
      msg.reply(
        `this command doesn't exist. Use \`${
          PREFIXES[msg.guild!.id]
        }:help setup\` for more info.`,
      );
      break;
    }
  },
  ehelp() {
    return printHelp();
  },
  perm: 'SEND_MESSAGES',
  admin: true,
  hide: false,
  category: commandCategories.util,
};
