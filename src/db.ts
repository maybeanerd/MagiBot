import {
  Client, TextChannel, Message, Guild,
} from 'discord.js';
import mongoose, { Model } from 'mongoose';
import { asyncForEach } from './bamands';
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
type Vote = {
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

async function updateUser(userid: string, update, guildID: string) {
  await UserModel.updateOne({ userID: userid, guildID }, update);
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

// automatic deletion of reports:
async function onHour(bot: Client, isFirst: boolean) {
  const d = new Date();
  const h = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  const e = h.getTime() - d.getTime();
  if (e > 100) {
    // some arbitrary time period
    setTimeout(onHour.bind(null, bot, false), e);
  }
  let msg: Message;
  if (isFirst) {
    const chann = bot.channels.fetch('382233880469438465');
    msg = await ((await chann) as TextChannel).send('0 %');
  }

  const t0 = process.hrtime();
  const nd = new Date();
  nd.setDate(nd.getDate() - 7);
  const guilds = bot.guilds.cache.array();
  let counter = 0;
  let lastPostedCounter = 0;
  let latestTimePassed = 0;
  await asyncForEach(guilds, async (G) => {
    const guildID = G.id;
    const localCounter = ++counter;
    await checkGuild(guildID);
    // update the guild settings entry so that it does NOT get deleted
    await SettingsModel.updateOne(
      { _id: guildID },
      { $set: { lastConnected: d } },
    );

    const ranking = await SaltrankModel.find({ guild: guildID });
    await asyncForEach(ranking, async (report) => {
      const removeData = await SaltModel.deleteMany({
        date: { $lt: nd },
        guild: guildID,
        salter: report.salter,
      });
      if (removeData.deletedCount && removeData.deletedCount > 0) {
        const slt = report.salt - removeData.deletedCount;
        if (slt <= 0) {
          await SaltrankModel.deleteOne({
            salter: report.salter,
            guild: guildID,
          });
        } else {
          await SaltrankModel.updateOne(
            { salter: report.salter, guild: guildID },
            { $set: { salt: slt } },
          );
        }
      }
    });
    // update percentage message
    if (msg) {
      const u = process.hrtime(t0);
      if (
        (u[0] - latestTimePassed > 0 && localCounter > lastPostedCounter)
        || localCounter === guilds.length
      ) {
        // eslint-disable-next-line prefer-destructuring
        latestTimePassed = u[0];
        lastPostedCounter = localCounter;
        const percentage = Math.round((localCounter / guilds.length) * 100);
        let uptime = '';
        // mins
        let x = Math.floor(u[0] / 60);
        if (x > 0) {
          uptime += `${x}m : `;
        }
        // secs
        x = u[0] % 60;
        if (x >= 0) {
          uptime += `${x}s`;
        }
        await msg.edit(`${percentage} % with ${uptime} passed`);
      }
    }
  });

  // delete every guild where lastConnected < nd from the DB TODO
  // find all guilds that have not connected for a week
  // or dont have the lastConnected attribute at all
  const guilds2 = await SettingsModel.find({
    $or: [
      { lastConnected: { $lt: nd } },
      { lastConnected: { $exists: false } },
    ],
  });

  await asyncForEach(guilds2, async (guild) => {
    // ignore salt and saltrank, as they are removed after 7 days anyways
    // eslint-disable-next-line no-underscore-dangle
    const guildID = guild._id;
    // remove all data saved for those guilds
    await StillMutedModel.deleteMany({ guildid: guildID });
    await UserModel.deleteMany({ guildID });
    await VoteModel.deleteMany({ guildid: guildID });
    await SettingsModel.deleteOne({ _id: guildID });
  });
}

const reactions = [
  '🇦',
  '🇧',
  '🇨',
  '🇩',
  '🇪',
  '🇫',
  '🇬',
  '🇭',
  '🇮',
  '🇯',
  '🇰',
  '🇱',
  '🇲',
  '🇳',
  '🇴',
  '🇵',
  '🇶',
  '🇷',
  '🇸',
  '🇹',
];
// this should take care of everything that needs to be done when a vote ends
async function endVote(vote: Vote, bot: Client) {
  try {
    const chann = (await bot.channels.fetch(vote.channelID)) as TextChannel;
    if (chann) {
      const msg = await chann.messages.fetch(vote.messageID);
      if (msg) {
        const reacts = msg.reactions;
        let finalReact: Array<{ reaction: number; count: number }> = [];
        reactions.forEach((x, i) => {
          if (i >= vote.options.length) {
            return;
          }
          const react = reacts.resolve(x);
          if (react && react.count) {
            if (!finalReact[0] || finalReact[0].count <= react.count) {
              if (!finalReact[0] || finalReact[0].count < react.count) {
                finalReact = [{ reaction: i, count: react.count }];
              } else {
                finalReact.push({ reaction: i, count: react.count });
              }
            }
          }
        });
        if (finalReact[0]) {
          if (finalReact.length > 1) {
            let str = `**${vote.topic}** ended.\n\nThere was a tie between `;
            if (vote.authorID) {
              str = `**${vote.topic}** by <@${vote.authorID}> ended.\n\nThere was a tie between `;
            }
            finalReact.forEach((react, i) => {
              str += `**${vote.options[react.reaction]}**`;
              if (i < finalReact.length - 2) {
                str += ', ';
              } else if (i === finalReact.length - 2) {
                str += ' and ';
              }
            });
            str += ` with each having ** ${finalReact[0].count - 1} ** votes.`;
            await msg.edit(str);
          } else {
            let str = `**${vote.topic}** ended.\n\nThe result is **${
              vote.options[finalReact[0].reaction]
            }** with **${finalReact[0].count - 1}** votes.`;
            if (vote.authorID) {
              str = `**${vote.topic}** by <@${
                vote.authorID
              }> ended.\n\nThe result is **${
                vote.options[finalReact[0].reaction]
              }** with **${finalReact[0].count - 1}** votes.`;
            }
            await msg.edit(str);
          }
        } else {
          let str = `**${vote.topic}** ended.\n\nCould not compute a result.`;
          if (vote.authorID) {
            str = `**${vote.topic}** by <@${vote.authorID}> ended.\n\nCould not compute a result.`;
          }
          await msg.edit(str);
        }
        await msg.reactions.removeAll();
      }
    }
  } catch (error) {
    console.error(JSON.stringify(error, null, 2));
    // eslint-disable-next-line eqeqeq
    if (error.httpStatus != 404 /*  'DiscordAPIError: Unknown Message' */) {
      throw new Error(error);
    }
  }
}
async function voteCheck(bot: Client) {
  const d = new Date();
  const h = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
    d.getSeconds() + 10,
    0,
  );
  const e = h.getTime() - d.getTime();
  if (e > 100) {
    // some arbitrary time period
    setTimeout(voteCheck.bind(null, bot), e);
  }
  // do vote stuff
  const nd = new Date();
  const votes = await VoteModel.find({ date: { $lte: nd } });
  await asyncForEach(votes, async (vote) => {
    try {
      await endVote(vote, bot);
      await vote.delete();
    } catch (err) {
      if (err.name === 'DiscordAPIError' && err.message === 'Missing Access') {
        await vote.delete();
      } else {
        throw err;
      }
    }
  });
  // endof vote stuff
}

async function getSaltKing(guildID: string) {
  const settings = await getSettings(guildID);
  return settings.saltKing;
}
async function getSaltRole(guildID: string) {
  const set = await getSettings(guildID);
  return set.saltRole;
}
async function setSettings(guildID: string, settings) {
  if (await getSettings(guildID)) {
    await SettingsModel.updateOne({ _id: guildID }, { $set: settings });
  }
  return true;
}
async function setSaltRole(guildID: string, roleID: string) {
  await setSettings(guildID, { saltRole: roleID });
}
async function getNotChannel(guildID: string) {
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
function setNotChannel(guildID: string, channelID: String | false) {
  return setSettings(guildID, { notChannel: channelID });
}
async function sendUpdate(update: string, bot: Client) {
  await asyncForEach(bot.guilds.cache.array(), async (G) => {
    if (G.available) {
      const cid = await getNotChannel(G.id);
      if (cid) {
        const channel = G.channels.cache.get(cid) as TextChannel;
        if (channel && G.me) {
          const perms = channel.permissionsFor(G.me);
          if (perms && perms.has('SEND_MESSAGES')) {
            if (G.id === '380669498014957569') {
              channel.send(`<@&460218236185739264> ${update}`);
            } else {
              channel.send(update);
            }
          }
        } else {
          setNotChannel(G.id, false);
        }
      }
    }
  });
}

async function getSalt(userid: string, guildID: string) {
  const result = await SaltrankModel.findOne({
    salter: userid,
    guild: guildID,
  });
  if (!result) {
    return 0;
  }
  return result.salt;
}

async function usageUp(userid: string, guildID: string) {
  const user = await getuser(userid, guildID);
  const updateval = user.botusage + 1;
  updateUser(userid, { $set: { botusage: updateval } }, guildID);
}

function setPrefix(guildID: string, pref?: string) {
  return setSettings(guildID, { prefix: pref });
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

export async function getAdminRoles(guildID: string) {
  const settings = await getSettings(guildID);
  return settings.adminRoles;
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

export async function getCommandChannel(guildID: string) {
  const settings = await getSettings(guildID);
  return settings.commandChannels;
}

async function setCommandChannel(
  guildID: string,
  cid: string,
  insert: boolean,
) {
  const channels = await getCommandChannel(guildID);
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

async function getJoinChannel(guildID: string) {
  const settings = await getSettings(guildID);
  return settings.joinChannels;
}

async function setJoinChannel(guildID: string, cid: string, insert: boolean) {
  const channels = await getJoinChannel(guildID);
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
  const settings = { joinChannels: channels };
  return setSettings(guildID, settings);
}

async function getBlacklistedUser(guildID: string) {
  const settings = await getSettings(guildID);
  return settings.blacklistedUsers;
}

export async function isBlacklistedUser(userid: string, guildID: string) {
  const users = await getBlacklistedUser(guildID);
  return users.includes(userid);
}

export async function setBlacklistedUser(
  userid: string,
  guildID: string,
  insert: boolean,
) {
  const users = await getBlacklistedUser(guildID);
  if (insert) {
    if (!users.includes(userid)) {
      users.push(userid);
    }
  } else {
    const index = users.indexOf(userid);
    if (index > -1) {
      users.splice(index, 1);
    }
  }
  const settings = { blacklistedUsers: users };
  return setSettings(guildID, settings);
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

async function joinsound(
  userid: string,
  surl: string | undefined,
  guildID: string,
) {
  if (await checks(userid, guildID)) {
    const update = { $set: { sound: surl } };
    await UserModel.updateOne({ userID: userid, guildID }, update);
  }
  return true;
}

export function startUp(bot:Client) {
  // repeating functions:
  onHour(bot, true);
  voteCheck(bot);
}
/*
export default {
  async startup(bot: Client) {
    // repeating functions:
    onHour(bot, true);
    voteCheck(bot);
  },
  async getUser(userid: string, guildID: string) {
    const result = await getuser(userid, guildID);
    return result;
  },
  usageUp(userid: string, guildID: string) {
    usageUp(userid, guildID);
  },
  async saltUp(userid1: string, userid2: string, G: Guild) {
    const ret = await saltUp(userid1, userid2, false, G.id);
    updateSaltKing(G);
    return ret;
  },
  async saltUpAdmin(userid1: string, userid2: string, G: Guild) {
    const ret = await saltUp(userid1, userid2, true, G.id);
    updateSaltKing(G);
    return ret;
  },
  getSalt(userid: string, guildID: string) {
    return getSalt(userid, guildID);
  },
  async getUsage(userid: string, guildID: string) {
    const user = await getuser(userid, guildID);
    return user.botusage;
  },
  async remOldestSalt(userid: string, G: Guild) {
    const guildID = G.id;
    const id = await SaltModel.find({ salter: userid, guild: guildID })
      .sort({ date: 1 })
      .limit(1);
    if (id[0]) {
      // eslint-disable-next-line no-underscore-dangle
      await SaltModel.deleteOne({ _id: id[0]._id });
      saltGuild(userid, guildID, -1);
      updateSaltKing(G);
      return true;
    }
    return false;
  },
  async addGuild(guildID: string) {
    await checkGuild(guildID);
  },
  topSalt(guildID: string) {
    return topSalt(guildID);
  },
  async joinable(guildID: string, cid: string) {
    const channels = await getJoinChannel(guildID);
    return channels.includes(cid);
  },
  async isAdmin(guildID: string, user: GuildMember) {
    // checks for admin and Owner, they can always use
    if (
      user.hasPermission('ADMINISTRATOR', {
        checkAdmin: true,
        checkOwner: true,
      })
    ) {
      return true;
    }
    // Owner is always admin hehe
    if (user.id === OWNERID) {
      return true;
    }
    const roles = await getAdminRole(guildID);
    let ret = false;
    roles.forEach((role) => {
      if (user.roles.cache.has(role)) {
        ret = true;
      }
    });
    return ret;
  },
  isAdminRole: async (guildID: string, adminRole: string) => {
    const roles = await getAdminRole(guildID);
    let ret = false;
    roles.forEach((role) => {
      if (adminRole === role) {
        ret = true;
      }
    });
    return ret;
  },
  async commandAllowed(guildID: string, cid: string) {
    const channels = await getCommandChannel(guildID);
    return channels.length === 0 || channels.includes(cid);
  },
  async isCommandChannel(guildID: string, cid: string) {
    const channels = await getCommandChannel(guildID);
    return channels.includes(cid);
  },
  async commandChannel(guildID: string) {
    const channels = await getCommandChannel(guildID);
    let out = '';
    channels.forEach((channel: string) => {
      out += ` <#${channel}>`;
    });
    return out;
  },
  async getSound(userid: string, guildID: string) {
    const user = await getuser(userid, guildID);
    return user.sound;
  },
  addSound(userid: string, surl: string | undefined, guildID: string) {
    return joinsound(userid, surl, guildID);
  },
  async isBlacklistedUser(userID: string, guildID: string) {
    if (await checks(userID, guildID)) {
      return isBlacklistedUser(userID, guildID);
    }
    return false;
  },
  setJoinable(guildID: string, channelID: string, insert: boolean) {
    return setJoinChannel(guildID, channelID, insert);
  },
  isJoinable: async (guildID: string, channelID: string) => {
    const channels = await getJoinChannel(guildID);
    return channels.includes(channelID);
  },
  setCommandChannel(guildID: string, channelID: string, insert: boolean) {
    return setCommandChannel(guildID, channelID, insert);
  },
  setAdmin(guildID: string, roleID: string, insert: boolean) {
    return setAdminRole(guildID, roleID, insert);
  },
  async setBlacklistedUser(guildID: string, userID: string, insert: boolean) {
    if (await checks(userID, guildID)) {
      return setBlacklistedUser(userID, guildID, insert);
    }
    return false;
  },
  getSettings(guildID: string) {
    return getSettings(guildID);
  },
  async clrSalt(userid: string, G: Guild) {
    const guildID = G.id;
    await SaltModel.deleteMany({ guild: guildID, salter: userid });
    await saltGuild(userid, guildID, 1, true);
    await updateSaltKing(G);
  },
  async resetSalt(G: Guild) {
    const guildID = G.id;
    await SaltrankModel.deleteMany({ guild: guildID });
    await SaltModel.deleteMany({ guild: guildID });
    await updateSaltKing(G);
  },
  async setNotification(guildID: string, cid: string | false) {
    await setNotChannel(guildID, cid);
  },
  isNotChannel: async (guildID: string, channID: string) => {
    const notChann = await getNotChannel(guildID);
    return channID === notChann;
  },
  sendUpdate(update: string, bot: Client) {
    sendUpdate(update, bot);
  },
  getPrefixE(guildID: string) {
    return getPrefix(guildID);
  },
  async setPrefixE(guildID: string, pref: string) {
    await setPrefix(guildID, pref);
    PREFIXES[guildID] = pref;
    return pref;
  },
  async getPrefixesE(bot: Client) {
    resetPrefixes();
    const guilds = bot.guilds.cache.array();
    asyncForEach(guilds, async (G) => {
      PREFIXES[G.id] = await getPrefix(G.id);
    });
  },
  async addVote(vote: Vote) {
    const voteCreated = new VoteModel(vote);
    await voteCreated.save();
    return voteCreated.toObject();
  },
  toggleStillMuted(userID: string, guildID: string, add: boolean) {
    return toggleStillMuted(userID, guildID, add);
  },
  async isStillMuted(userID: string, guildID: string) {
    const find = await StillMutedModel.findOne({
      userid: userID,
      guildid: guildID,
    });
    return find;
  },
};
 */
