import { Guild, GuildMember, CommandInteraction } from 'discord.js';
import {
  ConfigurationModel,
  UserModel,
  Configuration,
  SaltrankModel,
  StillMutedModel,
  GlobalUserDataModel,
} from './db';
import { OWNERID, PREFIXES } from './shared_assets';
import config from './configuration';
import { sendJoinEvent } from './webhooks';

export async function getUser(userid: string, guildID: string) {
  const result = await UserModel.findOneAndUpdate(
    {
      userID: userid,
      guildID,
    },
    {
      $setOnInsert: {
        warnings: 0,
        kicks: 0,
        bans: 0,
        botusage: 0,
        sound: undefined,
      },
    },
    {
      returnOriginal: false,
      upsert: true,
    },
  );
  return result;
}

export async function getGlobalUser(userId: string) {
  const result = await GlobalUserDataModel.findOneAndUpdate(
    {
      userID: userId,
    },
    {
      $setOnInsert: {
        sound: undefined,
      },
    },
    {
      returnOriginal: false,
      upsert: true,
    },
  );
  return result;
}

async function createFirstConfiguration(guildID: string) {
  const configuration = new ConfigurationModel({
    _id: guildID,
    commandChannels: [],
    adminRoles: [],
    joinChannels: [],
    blacklistedUsers: [],
    blacklistedEveryone: [],
    saltKing: undefined,
    saltRole: undefined,
    notChannel: undefined,
    prefix: config.prefix,
    lastConnected: new Date(),
  });
  await configuration.save();
  return configuration;
}

export async function getConfiguration(guildID: string) {
  let result = await ConfigurationModel.findById(guildID);
  if (!result) {
    await sendJoinEvent(
      `:wastebasket: couldn't find configuration for guild ${guildID} , resetting/setting empty state. Found this:${JSON.stringify(
        result,
        null,
        2,
      )}`,
    );

    result = await createFirstConfiguration(guildID);
  }
  return result;
}

export async function checkGuild(id: string) {
  // create configuration
  if (await getConfiguration(id)) {
    return true;
  }
  return false;
}

export async function setConfiguration(
  guildID: string,
  // this was difficult to find, but is awesome
  update: { [Property in keyof Configuration]?: Configuration[Property] },
) {
  if (await getConfiguration(guildID)) {
    await ConfigurationModel.updateOne({ _id: guildID }, { $set: update });
  }
  return true;
}

async function getSaltKing(guildID: string) {
  const configuration = await getConfiguration(guildID);
  return configuration.saltKing;
}

async function getSaltRole(guildID: string) {
  const set = await getConfiguration(guildID);
  return set.saltRole;
}

async function setSaltRole(guildID: string, roleID: string) {
  await setConfiguration(guildID, { saltRole: roleID });
}

function setSaltKing(guildID: string, userID: string) {
  return setConfiguration(guildID, { saltKing: userID });
}

// top 5 salty people
export async function topSalt(guildID: string) {
  const result = await SaltrankModel.find({ guild: guildID })
    .sort({ salt: -1 })
    .limit(5);
  if (!result) {
    return [];
  }
  return result;
}

export async function updateSaltKing(G: Guild) {
  if (G.available && G.me) {
    if (G.me.permissions.has('MANAGE_ROLES', true)) {
      const SaltKing = await getSaltKing(G.id);
      let SaltRole = await getSaltRole(G.id);
      const groles = G.roles;
      if (!SaltRole || !groles.cache.has(SaltRole)) {
        if (G.roles.cache.size < 250) {
          await G.roles
            .create({
              name: 'SaltKing',
              color: '#FFFFFF',
              position: 0,
              permissions: [],
              mentionable: true,
              reason:
                'SaltKing role needed for Saltranking to work. You can adjust this role if you like.',
            })
            .then(async (role) => {
              await setSaltRole(G.id, role.id);
              SaltRole = role.id;
            });
        } else {
          // TODO what do we do if we are missing permissions now?
          return;
        }
      }
      const sltID = await topSalt(G.id);
      let saltID: string | undefined;
      if (sltID[0]) {
        saltID = sltID[0].salter;
      }
      if (!SaltRole) {
        throw new Error('For some reason, there was no SaltRole.');
      }
      const role = await groles.fetch(SaltRole);
      if (role && role.position < G.me.roles.highest.position) {
        if (SaltKing && saltID !== SaltKing) {
          const user = await G.members.fetch(SaltKing).catch(() => {});
          if (user) {
            user.roles.remove(SaltRole, 'Is not as salty anymore');
          }
        }
        if (saltID) {
          const nuser = await G.members.fetch(saltID).catch(() => {});
          if (nuser) {
            if (!nuser.roles.cache.has(SaltRole)) {
              await nuser.roles.add(SaltRole, 'Saltiest user');
            }
          }
          if (saltID !== SaltKing) {
            await setSaltKing(G.id, saltID);
          }
        }
      } else {
        // TODO what do we do if we are missing permissions now?
      }
    } else {
      // TODO what do we do if we are missing permissions now?
    }
  }
}

export async function isJoinableVc(guildID: string, channelID: string) {
  const configuration = await getConfiguration(guildID);
  return (
    configuration.joinChannels.length === 0
    || configuration.joinChannels.includes(channelID)
  );
}

export async function setPrefix(guildID: string, prefix: string) {
  const success = await setConfiguration(guildID, {
    prefix,
  });
  if (success) {
    PREFIXES.set(guildID, prefix);
  }
  return success;
}

export async function getPrefix(guildID: string) {
  const configuration = await getConfiguration(guildID);
  const { prefix } = configuration;
  if (!prefix) {
    await setPrefix(guildID, config.prefix);
    return config.prefix;
  }
  return prefix;
}

export async function toggleStillMuted(
  userID: string,
  guildID: string,
  add: boolean,
) {
  if (add) {
    const isStillMutedAmount = await StillMutedModel.find({
      userid: userID,
      guildid: guildID,
    }).count();
    if (isStillMutedAmount === 0) {
      const newMute = new StillMutedModel({
        userid: userID,
        guildid: guildID,
      });
      await newMute.save();
    }
  } else {
    await StillMutedModel.deleteMany({
      userid: userID,
      guildid: guildID,
    });
  }
}

export async function getAdminRoles(guildID: string) {
  const configuration = await getConfiguration(guildID);
  return configuration.adminRoles;
}

export async function isAdmin(guildID: string, member: GuildMember) {
  // checks for admin and Owner, they can always use
  if (member.permissions.has('ADMINISTRATOR', true)) {
    return true;
  }
  // Owner of bot is always admin hehe
  if (member.id === OWNERID) {
    return true;
  }
  const roles = await getAdminRoles(guildID);
  return member.roles.cache.hasAny(...roles);
}

export async function interactionMemberIsAdmin(
  interaction: CommandInteraction,
) {
  const { member, guild } = interaction;
  if (member instanceof GuildMember) {
    // checks for admin and Owner, they can always use
    if (member.permissions.has('ADMINISTRATOR', true)) {
      return true;
    }
    const roles = await getAdminRoles(guild!.id);
    return member.roles.cache.hasAny(...roles);
  }
  if (member) {
    // checks for admin and Owner, they can always use
    if (interaction.memberPermissions?.has('ADMINISTRATOR', true)) {
      return true;
    }
  }
  // Owner of bot is always admin hehe
  if (interaction.user.id === OWNERID) {
    return true;
  }
  // default: no admin
  return false;
}

export async function getCommandChannels(guildID: string) {
  const configuration = await getConfiguration(guildID);
  return configuration.commandChannels;
}
