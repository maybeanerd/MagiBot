import { MessageEmbedOptions } from 'discord.js';
import { COLOR, PREFIXES } from '../shared_assets';
import { findMember, yesOrNo, findRole } from '../bamands';
import { commandCategories } from '../types/enums';
import { magibotCommand } from '../types/magibot';
import {
  getSettings,
  isJoinableVc,
  getAdminRoles,
  getNotChannel,
  setSettings,
  getCommandChannels,
  getPrefix,
  setPrefix,
} from '../dbHelpers';

async function setBlacklistedUser(
  userid: string,
  guildID: string,
  insert: boolean,
) {
  const settings = await getSettings(guildID);
  const { blacklistedUsers } = settings;
  if (insert) {
    if (!blacklistedUsers.includes(userid)) {
      blacklistedUsers.push(userid);
    }
  } else {
    const index = blacklistedUsers.indexOf(userid);
    if (index > -1) {
      blacklistedUsers.splice(index, 1);
    }
  }
  settings.blacklistedUsers = blacklistedUsers;
  await settings.save();
}

async function setJoinChannel(
  guildID: string,
  cid: string,
  setActive: boolean,
) {
  const settings = await getSettings(guildID);
  const { joinChannels } = settings;
  if (setActive) {
    if (!joinChannels.includes(cid)) {
      joinChannels.push(cid);
    }
  } else {
    const index = joinChannels.indexOf(cid);
    if (index > -1) {
      joinChannels.splice(index, 1);
    }
  }
  settings.joinChannels = joinChannels;
  await settings.save();
}

async function isAdminRole(guildID: string, role: string) {
  const roles = await getAdminRoles(guildID);
  let ret = false;
  roles.forEach((adminRole) => {
    if (role === adminRole) {
      ret = true;
    }
  });
  return ret;
}

async function setAdminRole(guildID: string, roleID: string, insert: boolean) {
  const roles = await getAdminRoles(guildID);
  if (insert) {
    if (!roles.includes(roleID)) {
      roles.push(roleID);
    }
  } else {
    const index = roles.indexOf(roleID);
    if (index > -1) {
      roles.splice(index, 1);
    }
  }
  const settings = { adminRoles: roles };
  return setSettings(guildID, settings);
}

async function isCommandChannel(guildID: string, cid: string) {
  const channels = await getCommandChannels(guildID);
  return channels.includes(cid);
}

async function setCommandChannel(
  guildID: string,
  cid: string,
  insert: boolean,
) {
  const channels = await getCommandChannels(guildID);
  if (insert) {
    if (!channels.includes(cid)) {
      channels.push(cid);
    }
  } else {
    const index = channels.indexOf(cid);
    if (index > -1) {
      channels.splice(index, 1);
    }
  }
  const settings = { commandChannels: channels };
  return setSettings(guildID, settings);
}

async function setNotificationChannel(
  guildID: string,
  notChannel: string | undefined,
) {
  const settings = await getSettings(guildID);
  settings.notChannel = notChannel;
  await settings.save();
}

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
          setBlacklistedUser(msg.guild!.id, uid, true);
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
          setBlacklistedUser(msg.guild!.id, uid, false);
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
          const isJoinable = await isJoinableVc(
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
            await setJoinChannel(msg.guild!.id, voiceChannel.id, !isJoinable);
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
        if (!(await isAdminRole(msg.guild!.id, rid))) {
          if (
            await yesOrNo(
              msg,
              `Do you want to set <@&${rid}> as admin role?`,
              `Cancelled setting <@&${rid}> as admin role`,
            )
          ) {
            await setAdminRole(msg.guild!.id, rid, true);
            msg.channel.send(`Successfully set <@&${rid}> as admin role!`);
          }
        } else if (
          await yesOrNo(
            msg,
            `Do you want to remove <@&${rid}> from the admin roles?`,
            `Cancelled removing <@&${rid}> from the admin roles`,
          )
        ) {
          await setAdminRole(msg.guild!.id, rid, false);
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
      const currentlyIsCommandChannel = await isCommandChannel(
          msg.guild!.id,
          msg.channel.id,
      );
      de = '';
      if (currentlyIsCommandChannel) {
        de = 'de';
      }
      if (
        await yesOrNo(
          msg,
          `Do you want to ${de}activate commands in <#${msg.channel.id}>?`,
          `Cancelled ${de}activating commands in <#${msg.channel.id}>`,
        )
      ) {
        await setCommandChannel(
            msg.guild!.id,
            msg.channel.id,
            !currentlyIsCommandChannel,
        );
        msg.channel.send(
          `Successfully ${de}activated commands in <#${msg.channel.id}>.`,
        );
      }
      break;
    case 'notification':
      // eslint-disable-next-line no-case-declarations
      const isNotChann = msg.channel.id === (await getNotChannel(msg.guild!.id));

      if (!isNotChann) {
        if (
          await yesOrNo(
            msg,
            `Do you want to activate MagiBot notifications in <#${msg.channel.id}>?`,
            `Cancelled activating notifications in <#${msg.channel.id}>`,
          )
        ) {
          await setNotificationChannel(msg.guild!.id, msg.channel.id);
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
        await setNotificationChannel(msg.guild!.id, undefined);
        msg.channel.send('Successfully deactivated notifications.');
      }
      break;
    case 'prefix':
      if (mention) {
        if (
          await yesOrNo(
            msg,
            `Do you want to change the prefix in ${
                msg.guild!.name
            } from \`${PREFIXES.get(msg.guild!.id)}.\` to \`${mention}.\` ?`,
            'Cancelled changing the prefix.',
          )
        ) {
          const newpref = await setPrefix(msg.guild!.id, mention);
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
      const set = await getSettings(msg.guild!.id);

      info.push({
        name: 'Prefix',
        value: `${await getPrefix(msg.guild!.id)}.`,
        inline: false,
      });

      let str = '';
      const { commandChannels } = set;
      /* eslint-enable no-case-declarations */

      if (commandChannels.length === 0) {
        str = 'no whitelist, so every channel is allowed';
      } else {
        const { guild } = msg;
        commandChannels.forEach((channel) => {
          const chann = guild!.channels.cache.get(channel);
          if (chann && !chann.deleted) {
            str += `<#${channel}> `;
          } else {
            setCommandChannel(guild!.id, channel, false);
          }
        });
      }
      info.push({
        name: 'Command channels',
        value: str,
        inline: false,
      });

      str = '';
      // eslint-disable-next-line no-case-declarations
      const { adminRoles } = set;
      if (adminRoles.length === 0) {
        str = 'Empty';
      } else {
        adminRoles.forEach((role) => {
          str += `<@&${role}> `;
        });
      }
      info.push({
        name: 'Admin roles',
        value: str,
        inline: false,
      });

      str = '';
      // eslint-disable-next-line no-case-declarations
      const { joinChannels } = set;
      if (joinChannels.length === 0) {
        str = 'Empty';
      } else {
        const { guild } = msg;
        joinChannels.forEach((channel) => {
          const chann = guild!.channels.cache.get(channel);
          if (chann && !chann.deleted) {
            str += `${chann.name}, `;
          } else {
            setJoinChannel(guild!.id, channel, false);
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
      // eslint-disable-next-line no-case-declarations
      const { blacklistedUsers } = set;
      if (blacklistedUsers.length === 0) {
        str = 'Empty';
      } else {
        blacklistedUsers.forEach((user) => {
          str += `<@!${user}>, `;
        });
        str = str.substring(0, str.length - 2);
      }
      info.push({
        name: 'Blacklisted users',
        value: str,
        inline: false,
      });

      /* str = '';
      const { blacklistedEveryone } = set;
      if (blacklistedEveryone.length === 0) {
        str = 'Empty';
      } else {
        blacklistedEveryone.forEach((com) => {
          str += `<#${com}>, `;
        });
        str = str.substring(0, str.length - 2);
      }
      info.push({
        name: 'Channel with @everyone blacklist',
        value: str,
        inline: false,
      }); */

      if (!set.saltKing) {
        str = 'Empty';
      } else {
        str = `<@${set.saltKing}>`;
      }
      info.push({
        name: 'SaltKing',
        value: str,
        inline: false,
      });
      if (!set.saltRole) {
        str = 'Empty';
      } else {
        str = `<@&${set.saltRole}>`;
      }
      info.push({
        name: 'SaltKing role',
        value: str,
        inline: false,
      });
      if (!set.notChannel) {
        str = 'Empty';
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
        `this command doesn't exist. Use \`${PREFIXES.get(
            msg.guild!.id,
        )}:help setup\` for more info.`,
      );
      break;
    }
  },
  ehelp() {
    return printHelp();
  },
  perm: ['SEND_MESSAGES', 'EMBED_LINKS'],
  admin: true,
  hide: false,
  category: commandCategories.util,
};
