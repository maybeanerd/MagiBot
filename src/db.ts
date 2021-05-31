import {
  Client, TextChannel, Message, Guild, GuildMember,
} from 'discord.js';
import mongoose, { Model } from 'mongoose';
import { asyncForEach } from './bamands';
import { OWNERID } from './shared_assets';
import config from './token';

if (!config.dburl) {
  throw new Error('Missing DB connection URL');
}
const url = config.dburl;

// fix deprecations
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);

mongoose.connect(`${url}/MagiBot`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  poolSize: 20,
  ssl: true,
});

// const mongooseConnction = mongoose.connection;

// define types and Models of DB. later on we will move them out of here and just import them
// settings per guild
type Settings = {
  _id: string;
  commandChannels: Array<string>;
  adminRoles: Array<string>;
  joinChannels: Array<string>;
  blacklistedUsers: Array<string>;
  blacklistedEveryone: Array<string>;
  saltKing?: string;
  saltRole?: string;
  notChannel?: string;
  prefix: string;
  lastConnected: Date;
};
const settingsSchema = new mongoose.Schema<Settings, Model<Settings>>(
  {
    _id: {
      // _id is auto indexed and unique
      type: String,
      required: true,
    },
    commandChannels: {
      type: [String],
      required: true,
    },
    adminRoles: {
      type: [String],
      required: true,
    },
    joinChannels: {
      type: [String],
      required: true,
    },
    blacklistedUsers: {
      type: [String],
      required: true,
    },
    blacklistedEveryone: {
      type: [String],
      required: true,
    },
    saltKing: {
      type: String,
      required: false,
    },
    saltRole: {
      type: String,
      required: false,
    },
    notChannel: {
      type: String,
      required: false,
    },
    prefix: {
      type: String,
      required: true,
    },
    lastConnected: {
      type: Date,
      required: true,
    },
  },
  { collection: 'settings' },
);
export const SettingsModel = mongoose.model('settings', settingsSchema);

// saltrank per user
type Saltrank = { salter: string; salt: number; guild: string };
const saltrankSchema = new mongoose.Schema<Saltrank, Model<Saltrank>>(
  {
    salter: {
      type: String,
      required: true,
    },
    salt: {
      type: Number,
      required: true,
    },
    guild: {
      type: String,
      required: true,
    },
  },
  { collection: 'saltrank' },
);
saltrankSchema.index({ salter: 1, guild: -1 }, { unique: true });
export const SaltrankModel = mongoose.model('saltrank', saltrankSchema);

// salt reports per report
type Salt = {
  salter: string;
  reporter: string;
  date: Date;
  guild: string;
};
const saltSchema = new mongoose.Schema<Salt, Model<Salt>>(
  {
    salter: {
      type: String,
      required: true,
    },
    reporter: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    guild: {
      type: String,
      required: true,
      index: true,
    },
  },
  { collection: 'salt' },
);
saltSchema.index({ salter: 1, reporter: -1 });
export const SaltModel = mongoose.model('salt', saltSchema);

// userdata per user per guild
type User = {
  userID: string;
  guildID: string;
  warnings: number;
  kicks: number;
  bans: number;
  botusage: number;
  sound?: string;
};
const userSchema = new mongoose.Schema<User, Model<User>>(
  {
    userID: {
      type: String,
      required: true,
    },
    guildID: {
      type: String,
      required: true,
    },
    warnings: {
      type: Number,
      required: true,
    },
    kicks: {
      type: Number,
      required: true,
    },
    bans: {
      type: Number,
      required: true,
    },
    botusage: {
      type: Number,
      required: true,
    },
    sound: {
      type: String,
      required: false,
    },
  },
  { collection: 'users' },
);
userSchema.index({ userID: 1, guildID: -1 }, { unique: true });
export const UserModel = mongoose.model('users', userSchema);

const deleteDuplicateUsers = false;
// TODO check if we have duplicates on live
UserModel.aggregate([
  {
    $group: {
      _id: {
        userID: '$userID',
        guildID: '$guildID',
      },
      count: {
        $sum: 1,
      },
    },
  },
]).then((duplicateUsers) => {
  console.log(
    'duplicate users:',
    JSON.stringify(
      duplicateUsers.filter((u) => u.count > 1),
      null,
      2,
    ),
  );
  if (deleteDuplicateUsers) {
    duplicateUsers
      .filter((u) => u.count > 1)
      .forEach(async (u) => {
        // eslint-disable-next-line no-underscore-dangle
        await UserModel.deleteMany(u._id);
        // eslint-disable-next-line no-underscore-dangle
        console.log('Deleted user', u._id);
      });
  }
});

// entry per vote
export type Vote = {
  messageID: string;
  channelID: string;
  options: Array<string>;
  topic: string;
  date: Date;
  guildid: string;
  authorID: string;
};
const voteSchema = new mongoose.Schema<Vote, Model<Vote>>(
  {
    messageID: {
      type: String,
      required: true,
    },
    channelID: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    guildid: {
      type: String,
      required: true,
    },
    authorID: {
      type: String,
      required: true,
    },
  },
  { collection: 'votes' },
);
voteSchema.index({ messageID: 1, channelID: 1 });
export const VoteModel = mongoose.model('votes', voteSchema);

// one entry per user per guild
// deprecated, we want to remove this system?
type StillMuted = { userid: string; guildid: string };
const stillMutedSchema = new mongoose.Schema<StillMuted, Model<StillMuted>>(
  {
    userid: {
      type: String,
      required: true,
    },
    guildid: {
      type: String,
      required: true,
    },
  },
  { collection: 'stillMuted' },
);
stillMutedSchema.index({ userid: 1, guildid: 1 });
export const StillMutedModel = mongoose.model('stillMuted', stillMutedSchema);

// Define Methods
export async function getUser(userid: string, guildID: string) {
  const result = await UserModel.findOneAndUpdate(
    { userID: userid, guildID },
    {
      $setOnInsert: {
        warnings: 0,
        kicks: 0,
        bans: 0,
        botusage: 0,
        sound: undefined,
      },
    },
    { returnOriginal: false, upsert: true },
  );
  return result;
}

async function firstSettings(guildID: string) {
  const settings = new SettingsModel({
    _id: guildID,
    commandChannels: [],
    adminRoles: [],
    joinChannels: [],
    blacklistedUsers: [],
    blacklistedEveryone: [],
    saltKing: false,
    saltRole: false,
    notChannel: false,
    prefix: config.prefix,
    lastConnected: new Date(),
  });
  await settings.save();
  return settings;
}
export async function getSettings(guildID: string) {
  let result = await SettingsModel.findById(guildID);
  if (!result) {
    result = await firstSettings(guildID);
  }
  return result;
}
export async function checkGuild(id: string) {
  // create settings
  if (await getSettings(id)) {
    return true;
  }
  return false;
}
export async function setSettings(
  guildID: string,
  // this was difficult to find, but is awesome
  update: { [Property in keyof Settings]?: Settings[Property] },
) {
  if (await getSettings(guildID)) {
    await SettingsModel.updateOne({ _id: guildID }, { $set: update });
  }
  return true;
}
async function getSaltKing(guildID: string) {
  const settings = await getSettings(guildID);
  return settings.saltKing;
}
async function getSaltRole(guildID: string) {
  const set = await getSettings(guildID);
  return set.saltRole;
}
async function setSaltRole(guildID: string, roleID: string) {
  await setSettings(guildID, { saltRole: roleID });
}

export async function getNotChannel(guildID: string) {
  const set = await getSettings(guildID);
  return set.notChannel;
}

function setSaltKing(guildID: string, userID: string) {
  return setSettings(guildID, { saltKing: userID });
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
    if (
      G.me.hasPermission('MANAGE_ROLES', {
        checkAdmin: true,
        checkOwner: false,
      })
    ) {
      const SaltKing = await getSaltKing(G.id);
      let SaltRole = await getSaltRole(G.id);
      const groles = G.roles;
      if (!SaltRole || !groles.cache.has(SaltRole)) {
        if (G.roles.cache.size < 250) {
          await G.roles
            .create({
              data: {
                name: 'SaltKing',
                color: '#FFFFFF',
                position: 0,
                permissions: [],
                mentionable: true,
              },
              reason:
                'SaltKing role needed for Saltranking to work. You can adjust this role if you like.',
            })
            .then(async (role) => {
              await setSaltRole(G.id, role.id);
              SaltRole = role.id;
            });
        } else {
          const channel = await getNotChannel(G.id);
          if (channel) {
            const chan = G.channels.cache.get(channel);
            if (chan) {
              const perms = chan.permissionsFor(G.me);
              if (perms && perms.has('SEND_MESSAGES')) {
                (chan as TextChannel).send(
                  `Hey there ${G.owner}!\nI regret to inform you that this server has 250 roles and I therefore can't add SaltKing. If you want to manage the role yourself delete one and then just change the settings of the role i create automatically.`,
                );
              }
            }
          }
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
        const channel = await getNotChannel(G.id);
        if (channel) {
          const chan = G.channels.cache.get(channel);
          if (chan) {
            const perms = chan.permissionsFor(G.me);
            if (perms && perms.has('SEND_MESSAGES')) {
              (chan as TextChannel).send(
                `Hey there ${G.owner}!\nI regret to inform you that my highest role is beneath <@&${SaltRole}>, which has the effect that i cannot give or take if from users.`,
              );
            }
          }
        }
      }
    } else {
      const channel = await getNotChannel(G.id);
      if (channel) {
        const chan = G.channels.cache.get(channel);
        if (chan) {
          const perms = chan.permissionsFor(G.me);
          if (perms && perms.has('SEND_MESSAGES')) {
            (chan as TextChannel).send(
              `Hey there ${G.owner}!\nI regret to inform you that i have no permission to manage roles and therefore can't manage the SaltKing role.`,
            );
          }
        }
      }
    }
  }
}

export async function isJoinableVc(guildID: string, channelID: string) {
  const settings = await getSettings(guildID);
  return settings.joinChannels.includes(channelID);
}

export async function setPrefix(guildID: string, prefix: string) {
  return setSettings(guildID, {
    prefix,
  });
}

export async function getPrefix(guildID: string) {
  const settings = await getSettings(guildID);
  const { prefix } = settings;
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
  if (
    add
    && !(
      (await StillMutedModel.find({
        userid: userID,
        guildid: guildID,
      }).count()) > 0
    )
  ) {
    const newMute = new StillMutedModel({ userid: userID, guildid: guildID });
    await newMute.save();
  } else if (!add) {
    await StillMutedModel.deleteMany({ userid: userID, guildid: guildID });
  }
}

export async function getAdminRoles(guildID: string) {
  const settings = await getSettings(guildID);
  return settings.adminRoles;
}

export async function isAdmin(guildID: string, member: GuildMember) {
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

export async function getCommandChannels(guildID: string) {
  const settings = await getSettings(guildID);
  return settings.commandChannels;
}

export async function isBlacklistedUser(userid: string, guildID: string) {
  const settings = await getSettings(guildID);
  const users = settings.blacklistedUsers;
  return users.includes(userid);
}

/* eslint-disable */
// TODO some time later , blacklist @everyone in these channels
async function getBlacklistedEveryone(guildID: string) {
  const settings = await getSettings(guildID);
  return settings.blacklistedEveryone;
}

async function setBlacklistedEveryone(
  guildID: string,
  cid: string,
  insert: boolean
) {}
/* eslint-enable */
