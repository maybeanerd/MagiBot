const MongoClient = require('mongodb').MongoClient;
const config = require(`${__dirname}/token.js`);

const url = config.dburl;

const DBL = require('dblapi.js');
const dbl = new DBL('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjM4NDgyMDIzMjU4MzI0OTkyMSIsImJvdCI6dHJ1ZSwiaWF0IjoxNTE5NTgyMjYyfQ.df01BPWTU8O711eB_hive_T6RUjgzpBtXEcVSj63RW0');

// Define Methods:
function getuser(userid, guildID) {
  return MongoClient.connect(url).then(async mclient => {
    const db = await mclient.db('MagiBot');
    const result = await db.collection('users').findOneAndUpdate({ userID: userid, guildID }, { $setOnInsert: { warnings: 0, kicks: 0, bans: 0, botusage: 0, sound: false } }, { returnOriginal: false, upsert: true });
    mclient.close();
    return result.value;
  });
}
function saltGuild(salter, guildID, add = 1, reset = false) {
  MongoClient.connect(url).then(async mclient => {
    const db = mclient.db('MagiBot');
    const user = await db.collection('saltrank').findOne({ salter, guild: guildID });
    if (!user) {
      const myobj = { salter, salt: 1, guild: guildID };
      await db.collection('saltrank').insertOne(myobj);
    } else {
      const slt = user.salt + add;
      if (slt <= 0 || reset) {
        await db.collection('saltrank').deleteOne({ salter, guild: guildID });
      } else {
        const update = { $set: { salt: slt } };
        await db.collection('saltrank').updateOne({ salter, guild: guildID }, update);
      }
    }
    mclient.close();
  });
}
function addSalt(userid, reporter, guildID) {
  return MongoClient.connect(url).then(mclient => {
    const db = mclient.db('MagiBot');
    const date = new Date();
    const myobj = { salter: userid, reporter, date, guild: guildID };
    return db.collection('salt').insertOne(myobj).then(() => {
      saltGuild(userid, guildID, 1);
      mclient.close();
      return 0;
    });
  });
}
function updateUser(userid, update, guildID) {
  MongoClient.connect(url, (err, mclient) => {
    if (err) throw err;
    const db = mclient.db('MagiBot');
    db.collection('users').updateOne({ userID: userid, guildID }, update, err2 => {
      if (err2) throw err2;
      mclient.close();
    });
  });
}
function saltDowntimeDone(userid1, userid2) {
  // get newest entry in salt
  return MongoClient.connect(url).then(async mclient => {
    const db = mclient.db('MagiBot');
    const d2 = await db.collection('salt').find({ salter: userid1, reporter: userid2 }).sort({ date: -1 })
      .limit(1)
      .toArray();
    mclient.close();
    if (d2[0]) {
      const d1 = new Date();
      const ret = (d1 - d2[0].date) / 1000 / 60 / 60;
      return ret;
    }
    return 2;
  });
}
function firstSettings(guildID) {
  return MongoClient.connect(url).then(async mclient => {
    const db = mclient.db('MagiBot');
    await db.collection('settings').insertOne({ _id: guildID, commandChannels: [], adminRoles: [], joinChannels: [], blacklistedUsers: [], blacklistedEveryone: [], saltKing: false, saltRole: false, notChannel: false, prefix: config.prefix, lastConnected: new Date() });
    const ret = await db.collection('settings').findOne({ _id: guildID });
    mclient.close();
    return ret;
  });
}
function getSettings(guildID) {
  return MongoClient.connect(url).then(async mclient => {
    const db = mclient.db('MagiBot');
    let result = await db.collection('settings').findOne({ _id: guildID });
    if (!result) {
      result = await firstSettings(guildID);
    }
    mclient.close();
    return result;
  });
}
async function checkGuild(id) {
  // create settings
  if (await getSettings(id)) {
    return true;
  }
  return false;
}
function toggleDBLvoted(userid, votd) {
  MongoClient.connect(url).then(async mclient => {
    const db = await mclient.db('MagiBot');
    await db.collection('DBLreminder').updateOne({ _id: userid }, { $set: { voted: votd } });
    mclient.close();
  });
}

// automatic deletion of reports:
async function onHour(bot, isFirst) {
  const d = new Date();
  const h = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  const e = h - d;
  if (e > 100) { // some arbitrary time period
    setTimeout(onHour.bind(null, bot, false), e);
  }
  let msg;
  if (isFirst) {
    const chann = bot.channels.get('382233880469438465');
    msg = await chann.send('0 %');
  }

  const t0 = process.hrtime();
  const nd = new Date();
  nd.setDate(nd.getDate() - 7);
  const guilds = await bot.guilds.array();
  await MongoClient.connect(url).then(async mclient => {
    const db = mclient.db('MagiBot');
    let counter = 0;
    let percCounter = 0;
    for (const GN in guilds) {
      const G = guilds[GN];
      const guildID = await G.id;
      await checkGuild(guildID);
      // update the guild settings entry so that it does NOT get deleted
      await db.collection('settings').updateOne({ _id: guildID }, { $set: { lastConnected: d } });

      const ranking = await db.collection('saltrank').find({ guild: guildID }).toArray();
      for (const i in ranking) {
        const report = ranking[i];
        const removeData = await db.collection('salt').deleteMany({ date: { $lt: nd }, guild: guildID, salter: report.salter });
        if (removeData.deletedCount && removeData.deletedCount > 0) {
          const slt = report.salt - removeData.deletedCount;
          if (slt <= 0) {
            await db.collection('saltrank').deleteOne({ salter: report.salter, guild: guildID });
          } else {
            await db.collection('saltrank').updateOne({ salter: report.salter, guild: guildID }, { $set: { salt: slt } });
          }
        }
      }
      // await updateSaltKing(G); this shouldnt be needed anymore

      // update percentage message
      if (msg) {
        const percentage = Math.round((++counter / guilds.length) * 100);
        if ((percentage - percCounter) > 0) {
          let uptime = '';
          const u = process.hrtime(t0);
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
          percCounter = percentage;
          msg.edit(`${percentage} % with ${uptime} passed`);
        }
      }
    }
    await mclient.close();
  });

  // delete every guild where lastConnected < nd from the DB TODO
  await MongoClient.connect(url).then(async mclient => {
    const db = await mclient.db('MagiBot');
    // find all guilds that have not connected for a week or dont have the lastConnected attribute at all
    const guilds2 = await db.collection('settings').find({ $or: [{ lastConnected: { $lt: nd } }, { lastConnected: { $exists: false } }] }).toArray();

    for (const g in guilds2) {
      const guildID = guilds2[g]._id;
      // ignore salt and saltrank, as they are removed after 7 days anyways

      // remove all data saved for those guilds
      await db.collection('stillmuted').deleteMany({ guildid: guildID });
      await db.collection('users').deleteMany({ guildID });
      await db.collection('votes').deleteMany({ guildid: guildID });
      await db.collection('settings').deleteOne({ _id: guildID });
    }
    mclient.close();
  });
}

async function dblReminder(bot) {
  const d = new Date();
  const h = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes() + 5, 0, 0);
  const e = h - d;
  if (e > 100) { // some arbitrary time period
    setTimeout(dblReminder.bind(null, bot), e);
  }
  await MongoClient.connect(url).then(async mclient => {
    const db = await mclient.db('MagiBot');
    const users = await db.collection('DBLreminder').find().toArray();
    mclient.close();
    if (users) {
      for (const u in users) {
        let user = users[u]._id;
        const usr = users[u];
        user = await bot.fetchUser(user);
        let dblFailed = false;
        const hasVoted = await dbl.hasVoted(user.id).catch(() => {
          dblFailed = true;
        });
        if (!dblFailed) {
          if (!hasVoted && !usr.voted) {
            await user.send(`Hey there ${user} you can now vote for me again! (<https://discordbots.org/bot/384820232583249921> and <https://bots.ondiscord.xyz/bots/384820232583249921>)\nIf you don't want these reminders anymore use \`k.dbl\` in a server im on.`).catch(() => { });
            toggleDBLvoted(user.id, true);
          } else if (hasVoted && usr.voted) {
            toggleDBLvoted(user.id, false);
          }
        }
      }
    }
  });
}
const reactions = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯', '🇰', '🇱', '🇲', '🇳', '🇴', '🇵', '🇶', '🇷', '🇸', '🇹'];
// this should take care of everything that needs to be done when a vote ends
async function endVote(vote, bot) {
  // structure: vote = { messageID: ms.id, channelID: ms.channel.id, options: args, topic: topic, date: date }
  const chann = await bot.channels.get(vote.channelID);
  if (chann) {
    const msg = await chann.fetchMessage(vote.messageID).catch(() => { });
    if (msg) {
      const reacts = msg.reactions;
      let finalReact = [];
      for (const x in reactions) {
        if (x >= vote.options.length) {
          break;
        }
        const react = await reacts.get(reactions[x]);
        if (react) {
          if (!finalReact[0] || finalReact[0].count <= react.count) {
            if (!finalReact[0] || finalReact[0].count < react.count) {
              finalReact = [{ reaction: x, count: react.count }];
            } else {
              finalReact.push({ reaction: x, count: react.count });
            }
          }
        }
      }
      if (finalReact[0]) {
        if (finalReact.length > 1) {
          let str = `** ${vote.topic} ** ended.\n\nThere was a tie between `;
          for (const i in finalReact) {
            str += `**${vote.options[finalReact[i].reaction]}**`;
            if (i < finalReact.length - 2) {
              str += ', ';
            } else if (i == finalReact.length - 2) {
              str += ' and ';
            }
          }
          str += ` with each having ** ${finalReact[0].count - 1} ** votes.`;
          await msg.edit(str);
        } else {
          await msg.edit(`**${vote.topic}** ended.\n\nThe result is **${vote.options[finalReact[0].reaction]}** with **${finalReact[0].count - 1}** votes.`);
        }
      } else {
        await msg.edit(`**${vote.topic}** ended.\n\nCould not compute a result.`);
      }
      await msg.clearReactions();
    }
  }
}
function voteCheck(bot) {
  const d = new Date();
  const h = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds() + 10, 0);
  const e = h - d;
  if (e > 100) { // some arbitrary time period
    setTimeout(voteCheck.bind(null, bot), e);
  }
  // do vote stuff
  MongoClient.connect(url).then(async mclient => {
    const db = await mclient.db('MagiBot');
    const nd = new Date();
    const votes = await db.collection('votes').find({ date: { $lte: nd } }).toArray();
    for (const i in votes) {
      const vote = votes[i];
      endVote(vote, bot);
      db.collection('votes').deleteOne(vote);
    }
    mclient.close();
  });
  // endof vote stuff
}

function isInDBL(userID) {
  return MongoClient.connect(url).then(async mclient => {
    const db = await mclient.db('MagiBot');
    const ret = await db.collection('DBLreminder').find({ _id: userID }).count();
    mclient.close();
    return ret;
  });
}

function toggleDBL(userID, add) {
  MongoClient.connect(url).then(async mclient => {
    const db = await mclient.db('MagiBot');
    if (add && !await isInDBL(userID)) {
      await db.collection('DBLreminder').insertOne({ _id: userID, voted: false });
    } else if (!add) {
      await db.collection('DBLreminder').deleteOne({ _id: userID });
    }
    mclient.close();
  });
}

function toggleStillMuted(userID, guildID, add) {
  MongoClient.connect(url).then(async mclient => {
    const db = await mclient.db('MagiBot');
    if (add && !(await db.collection('stillMuted').find({ userid: userID, guildid: guildID }).count() > 0)) {
      await db.collection('stillMuted').insertOne({ userid: userID, guildid: guildID });
    } else if (!add) {
      await db.collection('stillMuted').deleteMany({ userid: userID, guildid: guildID });
    }
    mclient.close();
  });
}
async function getSaltKing(guildID) {
  const settings = await getSettings(guildID);
  return settings.saltKing;
}
async function getSaltRole(guildID) {
  const set = await getSettings(guildID);
  return set.saltRole;
}
function setSettings(guildID, settings) {
  return MongoClient.connect(url).then(async mclient => {
    const db = mclient.db('MagiBot');
    if (await getSettings(guildID)) {
      await db.collection('settings').updateOne({ _id: guildID }, { $set: settings });
    }
    mclient.close();
    return true;
  });
}
async function setSaltRole(guildID, roleID) {
  await setSettings(guildID, { saltRole: roleID });
}
async function getNotChannel(guildID) {
  const set = await getSettings(guildID);
  return set.notChannel;
}
// top 5 salty people
function topSalt(guildID) {
  return MongoClient.connect(url).then(async mclient => {
    const db = mclient.db('MagiBot');
    const result = await db.collection('saltrank').find({ guild: guildID }).sort({ salt: -1 })
      .limit(5)
      .toArray();
    mclient.close();
    if (!result) {
      return [];
    }
    return result;
  });
}
function setSaltKing(guildID, userID) {
  return setSettings(guildID, { saltKing: userID });
}
async function updateSaltKing(G) {
  if (await G.available && G.me) {
    if (await G.me.hasPermission('MANAGE_ROLES', false, true)) {
      const SaltKing = await getSaltKing(G.id);
      let SaltRole = await getSaltRole(G.id);
      const groles = await G.roles;
      if (!SaltRole || !groles.has(SaltRole)) {
        if (G.roles.size < 250) {
          await G.createRole({ name: 'SaltKing', color: '#FFFFFF', position: 0, permissions: 0, mentionable: true }, 'SaltKing role needed for Saltranking to work. You can change the role if you like.').then(async role => {
            await setSaltRole(G.id, role.id);
            SaltRole = role.id;
          });
        } else {
          const channel = await getNotChannel(G.id);
          if (channel) {
            const chan = await G.channels.get(channel);
            if (await chan.permissionsFor(G.me).has('SEND_MESSAGES')) {
              chan.send(`Hey there ${G.owner}!\nI regret to inform you that this server has 250 roles and I therefore can't add SaltKing. If you want to manage the role yourself delete one and then just change the settings of the role i create automatically.`);
            }
          }
          return;
        }
      }
      const sltID = await topSalt(G.id);
      let saltID = false;
      if (sltID[0]) {
        saltID = sltID[0].salter;
      }
      if (groles.get(SaltRole).position < G.me.highestRole.position) {
        if (SaltKing && saltID != SaltKing) {
          const user = await G.fetchMember(SaltKing).catch(() => { });
          if (user) {
            user.removeRole(SaltRole, 'Is not as salty anymore');
          }
        }
        if (saltID) {
          const nuser = await G.fetchMember(saltID).catch(() => { });
          if (nuser) {
            if (!nuser.roles.has(SaltRole)) {
              await nuser.addRole(SaltRole, 'Saltiest user');
            }
          }
          if (saltID != SaltKing) {
            await setSaltKing(G.id, saltID);
          }
        }
      } else {
        const channel = await getNotChannel(G.id);
        if (channel) {
          const chan = await G.channels.get(channel);
          if (await chan.permissionsFor(G.me).has('SEND_MESSAGES')) {
            chan.send(`Hey there ${G.owner}!\nI regret to inform you that my highest role is beneath <@&${SaltRole}>, which has the effect that i cannot give or take if from users.`);
          }
        }
      }
    } else {
      const channel = await getNotChannel(G.id);
      if (channel) {
        const chan = await G.channels.get(channel);
        if (await chan.permissionsFor(G.me).has('SEND_MESSAGES')) {
          chan.send(`Hey there ${G.owner}!\nI regret to inform you that i have no permission to manage roles and therefore can't manage the SaltKing role.`);
        }
      }
    }
  }
}
function setNotChannel(guildID, channelID) {
  setSettings(guildID, { notChannel: channelID });
}
async function sendUpdate(update, bot) {
  const guilds = await bot.guilds.array();
  for (const GN in guilds) {
    const G = guilds[GN];
    if (await G.available) {
      const cid = await getNotChannel(G.id);
      if (cid) {
        const channel = await G.channels.get(cid);
        if (channel) {
          if (await channel.permissionsFor(G.me).has('SEND_MESSAGES')) {
            if (G.id == '380669498014957569') {
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
  }
}

function getSalt(userid, guildID) {
  return MongoClient.connect(url).then(async mclient => {
    const db = mclient.db('MagiBot');
    const result = await db.collection('saltrank').findOne({ salter: userid, guild: guildID });
    mclient.close();
    if (!result) {
      return 0;
    }
    return result.salt;
  });
}

async function saltUp(userid1, userid2, ad, guildID) {
  const time = await saltDowntimeDone(userid1, userid2);
  if (time > 1 || ad) {
    return addSalt(userid1, userid2, guildID);
  }
  return time;
}

async function usageUp(userid, guildID) {
  const user = await getuser(userid, guildID);
  const updateval = user.botusage + 1;
  updateUser(userid, { $set: { botusage: updateval } }, guildID);
}

async function checks(userid, guildID) {
  // maybe add more checks
  if (await getuser(userid, guildID)) {
    return true;
  }
  // else
  return false;
}
function setPrefix(guildID, pref) {
  return setSettings(guildID, { prefix: pref });
}
async function getPrefix(guildID) {
  let settings = await getSettings(guildID);
  settings = settings.prefix;
  if (!settings) {
    await setPrefix(guildID, config.prefix);
    return config.prefix;
  }
  return settings;
}

async function getAdminRole(guildID) {
  const settings = await getSettings(guildID);
  return settings.adminRoles;
}

async function setAdminRole(guildID, roleID, insert) {
  const roles = await getAdminRole(guildID);
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

async function getCommandChannel(guildID) {
  const settings = await getSettings(guildID);
  return settings.commandChannels;
}

async function setCommandChannel(guildID, cid, insert) {
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

async function getJoinChannel(guildID) {
  const settings = await getSettings(guildID);
  return settings.joinChannels;
}

async function setJoinChannel(guildID, cid, insert) {
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
async function getBlacklistedUser(guildID) {
  const settings = await getSettings(guildID);
  return settings.blacklistedUsers;
}
async function isBlacklistedUser(userid, guildID) {
  const users = await getBlacklistedUser(guildID);
  return users.includes(userid);
}

async function setBlacklistedUser(userid, guildID, insert) {
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
async function getBlacklistedEveryone(guildID) {
  const settings = await getSettings(guildID);
  return settings.blacklistedEveryone;
}
async function setBlacklistedEveryone(guildID, cid, insert) {
}
/* eslint-enable */

function joinsound(userid, surl, guildID) {
  return MongoClient.connect(url).then(async mclient => {
    const db = mclient.db('MagiBot');
    if (await checks(userid, guildID)) {
      const update = { $set: { sound: surl } };
      await db.collection('users').updateOne({ userID: userid, guildID }, update);
    }
    mclient.close();
    return true;
  });
}

module.exports = {
  async startup(bot) {
    // create Collection
    await MongoClient.connect(url).then(async mclient => {
      const db = mclient.db('MagiBot');
      if (!await db.collection('settings')) {
        await db.createCollection('settings').then(() => {
        });
      }
      // Dataset of salt
      if (!db.collection('salt')) {
        db.createCollection('salt', err => {
          if (err) throw err;
        });
      }
      if (!db.collection('saltrank')) {
        db.createCollection('saltrank', err => {
          if (err) throw err;
        });
      }
      if (!db.collection('users')) {
        db.createCollection('users', err => {
          if (err) throw err;
        });
      }
      if (!db.collection('votes')) {
        db.createCollection('votes', err => {
          if (err) throw err;
        });
      }
      mclient.close();
    });
    // repeating functions:
    onHour(bot, true);
    dblReminder(bot);
    voteCheck(bot);
  },
  async getUser(userid, guildID) {
    const result = await getuser(userid, guildID);
    return result;
  },
  usageUp(userid, guildID) {
    usageUp(userid, guildID);
  },
  async saltUp(userid1, userid2, G) {
    const ret = await saltUp(userid1, userid2, false, G.id);
    updateSaltKing(G);
    return ret;
  },
  async saltUpAdmin(userid1, userid2, G) {
    const ret = await saltUp(userid1, userid2, true, G.id);
    updateSaltKing(G);
    return ret;
  },
  getSalt(userid, guildID) {
    return getSalt(userid, guildID);
  },
  async getUsage(userid, guildID) {
    const user = await getuser(userid, guildID);
    return parseInt(user.botusage, 10);
  },
  remOldestSalt(userid, G) {
    return MongoClient.connect(url).then(async mclient => {
      const guildID = G.id;
      const db = mclient.db('MagiBot');
      const id = await db.collection('salt').find({ salter: userid, guild: guildID }).sort({ date: 1 })
        .limit(1)
        .toArray();
      if (id[0]) {
        await db.collection('salt').deleteOne({ _id: id[0]._id });
        saltGuild(userid, guildID, -1);
        mclient.close();
        updateSaltKing(G);
        return true;
      }
      mclient.close();
      return false;
    });
  },
  async addGuild(guildID) {
    await checkGuild(guildID);
  },
  topSalt(guildID) {
    return topSalt(guildID);
  },
  async joinable(guildID, cid) {
    const channels = await getJoinChannel(guildID);
    return channels.includes(cid);
  },
  async isAdmin(guildID, user, bot) {
    // checks for admin and Owner, they can always use
    if (user.hasPermission('ADMINISTRATOR', false, true, true)) {
      return true;
    }
    // Owner is always admin hehe
    if (user.id == bot.OWNERID) {
      return true;
    }
    const roles = await getAdminRole(guildID);
    for (const role in roles) {
      if (user.roles.has(roles[role])) {
        return true;
      }
    }
    return false;
  },
  isAdminRole: async (guildID, adminRole) => {
    const roles = await getAdminRole(guildID);
    for (const role in roles) {
      if (adminRole == roles[role]) {
        return true;
      }
    }
    return false;
  },
  async commandAllowed(guildID, cid) {
    const channels = await getCommandChannel(guildID);
    return channels.length == 0 || channels.includes(cid);
  }, async isCommandChannel(guildID, cid) {
    const channels = await getCommandChannel(guildID);
    return channels.includes(cid);
  },
  async commandChannel(guildID) {
    const channels = await getCommandChannel(guildID);
    let out = '';
    for (const channel in channels) {
      out += ` <#${channels[channel]}>`;
    }
    return out;
  },
  async getSound(userid, guildID) {
    const user = await getuser(userid, guildID);
    return user.sound;
  },
  addSound(userid, surl, guildID) {
    return joinsound(userid, surl, guildID);
  },
  async isBlacklistedUser(userID, guildID) {
    if (await checks(userID, guildID)) {
      return isBlacklistedUser(userID, guildID);
    }
    return false;
  },
  setJoinable(guildID, channelID, insert) {
    return setJoinChannel(guildID, channelID, insert);
  },
  isJoinable: async (guildID, channelID) => {
    const channels = await getJoinChannel(guildID);
    return channels.includes(channelID);
  },
  setCommandChannel(guildID, channelID, insert) {
    return setCommandChannel(guildID, channelID, insert);
  },
  setAdmin(guildID, roleID, insert) {
    return setAdminRole(guildID, roleID, insert);
  },
  async setBlacklistedUser(guildID, userID, insert) {
    if (await checks(userID, guildID)) {
      return setBlacklistedUser(userID, guildID, insert);
    }
    return false;
  },
  getSettings(guildID) {
    return getSettings(guildID);
  },
  clrSalt(userid, G) {
    return MongoClient.connect(url).then(async mclient => {
      const guildID = G.id;
      const db = mclient.db('MagiBot');
      await db.collection('salt').deleteMany({ guild: guildID, salter: userid });
      saltGuild(userid, guildID, 1, true);
      mclient.close();
      updateSaltKing(G);
    });
  },
  async resetSalt(G) {
    await MongoClient.connect(url).then(async mclient => {
      const guildID = G.id;
      const db = await mclient.db('MagiBot');
      await db.collection('saltrank').deleteMany({ guild: guildID });
      await db.collection('salt').deleteMany({ guild: guildID });
      updateSaltKing(G);
      mclient.close();
    });
  },
  async setNotification(guildID, cid) {
    await setNotChannel(guildID, cid);
  },
  isNotChannel: async (guildID, channID) => {
    const notChann = await getNotChannel(guildID);
    return channID == notChann;
  },
  sendUpdate(update, bot) {
    sendUpdate(update, bot);
  },
  getPrefixE(guildID) {
    return getPrefix(guildID);
  },
  async setPrefixE(guildID, pref, bot) {
    await setPrefix(guildID, pref);
    bot.PREFIXES[guildID] = pref;
    return pref;
  },
  async getPrefixesE(bot) {
    bot.PREFIXES = {};
    const guilds = bot.guilds.array();
    for (const G in guilds) {
      bot.PREFIXES[guilds[G].id] = await getPrefix(guilds[G].id);
    }
  },
  toggleDBLE(userID, add) {
    toggleDBL(userID, add);
  },
  getDBLE(userID) {
    return isInDBL(userID);
  },
  addVote(vote) {
    MongoClient.connect(url).then(async mclient => {
      const db = await mclient.db('MagiBot');
      db.collection('votes').insertOne(vote);
      mclient.close();
    });
  },
  toggleStillMuted(userID, guildID, add) {
    toggleStillMuted(userID, guildID, add);
  },
  async isStillMuted(userID, guildID) {
    let find;
    await MongoClient.connect(url).then(async mclient => {
      const db = await mclient.db('MagiBot');
      find = await db.collection('stillMuted').findOne({ userid: userID, guildid: guildID });
      mclient.close();
    });
    return find;
  },
  getDBLSubs() {
    return MongoClient.connect(url).then(async mclient => {
      const db = await mclient.db('MagiBot');
      const users = await db.collection('DBLreminder').find().toArray();
      mclient.close();
      return users;
    });
  }
};
