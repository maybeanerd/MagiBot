var MongoClient = require('mongodb').MongoClient;
var config = require(__dirname + '/token.js'); /*use \\ as path on Win and / on Unix*/

var url = config.dburl;

const DBL = require("dblapi.js");
const dbl = new DBL('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjM4NDgyMDIzMjU4MzI0OTkyMSIsImJvdCI6dHJ1ZSwiaWF0IjoxNTE5NTgyMjYyfQ.df01BPWTU8O711eB_hive_T6RUjgzpBtXEcVSj63RW0');

var token = require(__dirname + '/token.js');
const axios = require('axios');

var botStarted = true;

//Define Methods:
async function getuser(userid, guildID) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = await mclient.db("MagiBot");
        let result = await db.collection("users").findOneAndUpdate({ userID: userid, guildID: guildID }, { $setOnInsert: { warnings: 0, kicks: 0, bans: 0, botusage: 0, sound: false } }, { returnOriginal: false, upsert: true });
        mclient.close();
        return result.value;
    });
}
async function addSalt(userid, reporter, guildID) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db('MagiBot');
        let date = new Date();
        var myobj = { salter: userid, reporter: reporter, date: date, guild: guildID };
        return db.collection("salt").insertOne(myobj).then(function (res) {
            saltGuild(userid, guildID, 1);
            mclient.close();
            return 0;
        });
    });
}

async function updateUser(userid, update, guildID) {
    MongoClient.connect(url, function (err, mclient) {
        if (err) throw err;
        var db = mclient.db("MagiBot");
        db.collection("users").updateOne({ userID: userid, guildID: guildID }, update, function (err, res) {
            if (err) throw err;
            mclient.close();
        });
    });
}
async function saltDowntimeDone(userid1, userid2) {
    //get newest entry in salt
    return MongoClient.connect(url).then(async function (mclient) {
        let db = mclient.db('MagiBot');
        let d2 = await db.collection("salt").find({ salter: userid1, reporter: userid2 }).sort({ date: -1 }).limit(1).toArray();
        mclient.close();
        if (d2[0]) {
            let d1 = new Date();
            let ret = ((d1 - d2[0].date) / 1000 / 60 / 60);
            return ret;
        } else {
            return 2;
        }
    });
}

//automatic deletion of reports: 
async function onHour(bot, isFirst) {
    let d = new Date(),
        h = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0),
        e = h - d;
    if (e > 100) { // some arbitrary time period
        setTimeout(onHour.bind(null, bot, false), e);
    }
    var t0 = process.hrtime();
    let nd = new Date();
    nd.setDate(nd.getDate() - 7);
    var guilds = await bot.guilds.array();
    await MongoClient.connect(url).then(async function (mclient) {
        let db = mclient.db('MagiBot');
        for (let GN in guilds) {
            var G = guilds[GN];
            let guildID = await G.id;
            await checkGuild(guildID);
            //update the guild settings entry so that it does NOT get deleted
            setSettings(guildID, { lastConnected: d });
            var ranking = await db.collection("saltrank").find({ guild: guildID }).toArray();
            for (var i in ranking) {
                let report = ranking[i];
                let removeData = await db.collection("salt").deleteMany({ date: { $lt: nd }, guild: guildID, salter: report.salter });
                if (removeData.deletedCount && removeData.deletedCount > 0) {
                    let slt = report.salt - removeData.deletedCount;
                    if (slt <= 0) {
                        await db.collection("saltrank").deleteOne({ salter: report.salter, guild: guildID });
                    } else {
                        await db.collection("saltrank").updateOne({ salter: report.salter, guild: guildID }, { $set: { salt: slt } });
                    }
                }
            }
            //await updateSaltKing(G);
        }
        await mclient.close();
    });
    if (isFirst) {
        var uptime = "";
        let u = process.hrtime(t0);
        //mins
        let x = Math.floor(u[0] / 60);
        if (x > 0) {
            uptime += x + "m : ";
        }
        //secs
        x = u[0] % 60;
        if (x >= 0) {
            uptime += x + "s";
        }
        let chann = bot.channels.get("382233880469438465");
        chann.send("Startup done!\nChecked " + guilds.length + " guilds in " + uptime);
    }
    //for stable only: still just an idea 
    if (token.BonDAPI) {
        axios.post('https://bots.ondiscord.xyz/bot-api/bots/384820232583249921/guilds', { "guildCount": guilds.length }, { "Content-Type": "application/json", "Authorization": token.BonDAPI }).then((res) => { console.log(res) });
    }
    //delete every guild where lastConnected < nd from the DB TODO
}

async function dblReminder(bot) {
    var d = new Date(),
        h = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes() + 5, 0, 0),
        e = h - d;
    if (e > 100) { // some arbitrary time period
        setTimeout(dblReminder.bind(null, bot), e);
    }
    await MongoClient.connect(url).then(async function (mclient) {
        let db = await mclient.db('MagiBot');
        let users = await db.collection("DBLreminder").find().toArray();
        mclient.close();
        if (users) {
            for (let u in users) {
                let user = users[u]["_id"];
                let usr = users[u];
                user = await bot.fetchUser(user);
                if (!(await dbl.hasVoted(user.id)) && !(usr.voted)) {
                    await user.send("Hey there " + user + " you can now vote for me again! (<https://discordbots.org/bot/384820232583249921> and <https://bots.ondiscord.xyz/bots/384820232583249921>)\nIf you don't want these reminders anymore use `k.dbl` in a server im on.").catch((err) => { });
                    toggleDBLvoted(user.id, true);
                } else if (await dbl.hasVoted(user.id) && usr.voted) {
                    toggleDBLvoted(user.id, false);
                }
            }
        }
    });
}
async function voteCheck(bot) {
    var d = new Date(),
        h = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds() + 10, 0),
        e = h - d;
    if (e > 100) { // some arbitrary time period
        setTimeout(voteCheck.bind(null, bot), e);
    }
    //do vote stuff
    MongoClient.connect(url).then(async function (mclient) {
        let db = await mclient.db('MagiBot');
        let nd = new Date();
        votes = await db.collection("votes").find({ date: { $lte: nd } }).toArray();
        for (var i in votes) {
            var vote = votes[i];
            endVote(vote, bot);
            db.collection("votes").deleteOne(vote);
        }
        mclient.close();
    });
    //endof vote stuff
}

var reactions = ["🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮", "🇯", "🇰", "🇱", "🇲", "🇳", "🇴", "🇵", "🇶", "🇷", "🇸", "🇹"];
//this should take care of everything that needs to be done when a vote ends
async function endVote(vote, bot) {
    //structure: vote = { messageID: ms.id, channelID: ms.channel.id, options: args, topic: topic, date: date }
    var chann = await bot.channels.get(vote.channelID);
    if (chann) {
        var msg = await chann.fetchMessage(vote.messageID).catch(() => { });
        if (msg) {
            var reacts = msg.reactions;
            var finalReact = [];
            for (var x in reactions) {
                if (x >= vote.options.length) {
                    break;
                }
                var react = await reacts.get(reactions[x]);
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
                    var str = "** " + vote.topic + " ** ended.\n\nThere was a tie between ";
                    for (var i in finalReact) {
                        str += "**" + vote.options[finalReact[i].reaction] + "**";
                        if (i < finalReact.length - 2) {
                            str += ", ";
                        } else {
                            if (i == finalReact.length - 2)
                                str += " and ";
                        }
                    }
                    str += " with each having ** " + (finalReact[0].count - 1) + " ** votes.";
                    await msg.edit(str);
                } else {
                    await msg.edit("**" + vote.topic + "** ended.\n\nThe result is **" + vote.options[finalReact[0].reaction] + "** with **" + (finalReact[0].count - 1) + "** votes.");
                }
            } else {
                await msg.edit("**" + vote.topic + "** ended.\n\nCould not compute a result.");
            }
            await msg.clearReactions();
        }
    }
}



async function toggleDBL(userID, add) {
    MongoClient.connect(url).then(async function (mclient) {
        let db = await mclient.db('MagiBot');
        if (add && !(await isInDBL(userID))) {
            await db.collection("DBLreminder").insertOne({ _id: userID, voted: false });
        } else if (!add) {
            await db.collection("DBLreminder").deleteOne({ _id: userID });
        }
        mclient.close();
    });
}

async function toggleStillMuted(userID, guildID, add) {
    MongoClient.connect(url).then(async function (mclient) {
        let db = await mclient.db('MagiBot');
        if (add && !((await db.collection("stillMuted").find({ userid: userID, guildid: guildID }).count()) > 0)) {
            await db.collection("stillMuted").insertOne({ userid: userID, guildid: guildID });
        } else if (!add) {
            await db.collection("stillMuted").deleteMany({ userid: userID, guildid: guildID });
        }
        mclient.close();
    });
}

async function toggleDBLvoted(userid, votd) {
    MongoClient.connect(url).then(async function (mclient) {
        let db = await mclient.db('MagiBot');
        await db.collection("DBLreminder").updateOne({ _id: userid }, { $set: { voted: votd } });
        mclient.close();
    });
}

async function isInDBL(userID) {
    return MongoClient.connect(url).then(async function (mclient) {
        let db = await mclient.db('MagiBot');
        let ret = await db.collection("DBLreminder").find({ _id: userID }).count();
        mclient.close();
        return ret;
    });
}

async function updateSaltKing(G) {
    if (await G.available && G.me) {
        if (await G.me.hasPermission("MANAGE_ROLES", false, true)) {
            let SaltKing = await getSaltKing(G.id);
            let SaltRole = await getSaltRole(G.id);
            let groles = await G.roles;
            if (!SaltRole || !groles.has(SaltRole)) {
                if (G.roles.size < 250) {
                    await G.createRole({ name: "SaltKing", color: '#FFFFFF', position: 0, permissions: 0, mentionable: true }, "SaltKing role needed for Saltranking to work. You can change the role if you like.").then(async function (role) {
                        await setSaltRole(G.id, role.id);
                        SaltRole = role.id
                    });
                } else {
                    let channel = await getNotChannel(G.id);
                    if (channel) {
                        let chan = await G.channels.get(channel);
                        if (await chan.permissionsFor(G.me).has("SEND_MESSAGES")) {
                            chan.send("Hey there " + G.owner + "!\nI regret to inform you that this server has 250 roles and I therefore can't add SaltKing. If you want to manage the role yourself delete one and then just change the settings of the role i create automatically.");
                        }
                    }
                    return;
                }
            }
            let sltID = await topSalt(G.id);
            let saltID = false;
            if (sltID[0]) {
                saltID = sltID[0].salter;
            }
            if (groles.get(SaltRole).position < G.me.highestRole.position) {
                if (SaltKing && saltID != SaltKing) {
                    let user = await G.fetchMember(SaltKing).catch(() => { });
                    if (user) {
                        user.removeRole(SaltRole, "Is not as salty anymore");
                    }
                }
                if (saltID) {
                    let nuser = await G.fetchMember(saltID).catch(() => { });
                    if (nuser) {
                        if (!(nuser.roles.has(SaltRole))) {
                            await nuser.addRole(SaltRole, "Saltiest user");
                        }
                    }
                    if (saltID != SaltKing) {
                        await setSaltKing(G.id, saltID);
                    }
                }
            } else {
                let channel = await getNotChannel(G.id);
                if (channel) {
                    let chan = await G.channels.get(channel);
                    if (await chan.permissionsFor(G.me).has("SEND_MESSAGES")) {
                        chan.send("Hey there " + G.owner + "!\nI regret to inform you that my highest role is beneath <@&" + SaltRole + ">, which has the effect that i cannot give or take if from users.");
                    }
                }
            }
        } else {
            let channel = await getNotChannel(G.id);
            if (channel) {
                let chan = await G.channels.get(channel);
                if (await chan.permissionsFor(G.me).has("SEND_MESSAGES")) {
                    chan.send("Hey there " + G.owner + "!\nI regret to inform you that i have no permission to manage roles and therefore can't manage the SaltKing role.");
                }
            }
        }
    }
}

async function sendUpdate(update, bot) {
    await MongoClient.connect(url).then(async function (mclient) {
        let db = mclient.db('MagiBot');
        var guilds = await bot.guilds.array();
        for (let GN in guilds) {
            var G = guilds[GN];
            if (await G.available) {
                let cid = await getNotChannel(G.id);
                if (cid) {
                    let channel = await G.channels.get(cid);
                    if (channel) {
                        if (await channel.permissionsFor(G.me).has("SEND_MESSAGES")) {
                            if (G.id == "380669498014957569") {
                                channel.send("<@&460218236185739264> " + update);
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
        mclient.close();
    });
}

//top 5 salty people
async function topSalt(guildID) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db("MagiBot");
        var result = await db.collection("saltrank").find({ guild: guildID }).sort({ salt: -1 }).limit(5).toArray();
        mclient.close();
        if (!result) {
            return [];
        }
        return result;
    });
}

async function setNotChannel(guildID, channelID) {
    setSettings(guildID, { notChannel: channelID });
}

async function getNotChannel(guildID) {
    let set = await getSettings(guildID);
    return set.notChannel;
}


async function getSalt(userid, guildID) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db("MagiBot");
        var result = await db.collection("saltrank").findOne({ salter: userid, guild: guildID });
        mclient.close();
        if (!result) {
            return 0;
        }
        return result.salt;
    });
}

async function saltUp(userid1, userid2, ad, guildID) {
    let time = await saltDowntimeDone(userid1, userid2);
    if (time > 1 || ad) {
        return addSalt(userid1, userid2, guildID);
    } else {
        return time;
    }
}

async function usageUp(userid, guildID) {
    let user = await getuser(userid, guildID);
    var updateval = user.botusage + 1;
    updateUser(userid, { $set: { botusage: (updateval) } }, guildID);
}

async function checks(userid, guildID) {
    //maybe add more checks
    if (await getuser(userid, guildID)) {
        return true;
    }
    //else
    return false;
}

async function checkGuild(id) {
    //create settings
    if (await getSettings(id)) {
        return true;
    } else {
        return false;
    }

}

async function setSaltRole(guildID, roleID) {
    await setSettings(guildID, { saltRole: roleID });
}

async function getSaltRole(guildID) {
    let set = await getSettings(guildID);
    return set.saltRole;
}

async function setSettings(guildID, settings) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db("MagiBot");
        if (await getSettings(guildID)) {
            await db.collection("settings").updateOne({ _id: guildID }, { $set: settings });
        }
        mclient.close();
        return true;
    });
}

async function firstSettings(guildID) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db("MagiBot");
        await db.collection("settings").insertOne({ _id: guildID, commandChannels: [], adminRoles: [], joinChannels: [], blacklistedUsers: [], blacklistedEveryone: [], saltKing: false, saltRole: false, notChannel: false, prefix: config.prefix, lastConnected: new Date() });
        var ret = await db.collection("settings").findOne({ _id: guildID });
        mclient.close();
        return ret;
    });
}
async function getSaltKing(guildID) {
    let settings = await getSettings(guildID);
    return settings.saltKing;
}
async function setSaltKing(guildID, userID) {
    return setSettings(guildID, { saltKing: userID });
}

async function getPrefix(guildID) {
    let settings = await getSettings(guildID);
    settings = settings.prefix;
    if (!settings) {
        await setPrefix(guildID, config.prefix);
        return config.prefix;
    } else {
        return settings;
    }
}

async function setPrefix(guildID, pref) {
    return setSettings(guildID, { prefix: pref });
}

async function saltGuild(salter, guildID, add = 1, reset = false) {
    MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db("MagiBot");
        var user = await db.collection("saltrank").findOne({ salter: salter, guild: guildID });
        if (!user) {
            var myobj = { salter: salter, salt: 1, guild: guildID };
            await db.collection("saltrank").insertOne(myobj);
        } else {
            let slt = user.salt + add;
            if (slt <= 0 || reset) {
                await db.collection("saltrank").deleteOne({ salter: salter, guild: guildID });
            } else {
                var update = { $set: { salt: slt } };
                await db.collection("saltrank").updateOne({ salter: salter, guild: guildID }, update);
            }
        }
        mclient.close();
    });
}

async function getSettings(guildID) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db("MagiBot");
        var result = await db.collection("settings").findOne({ _id: guildID });
        if (!result) {
            result = await firstSettings(guildID);
        }
        mclient.close();
        return result;
    });
}


async function getAdminRole(guildID) {
    var settings = await getSettings(guildID);
    return settings.adminRoles;
}

async function setAdminRole(guildID, roleID, insert) {
    var roles = await getAdminRole(guildID);
    if (insert) {
        if (!roles.includes(roleID)) {
            roles.push(roleID);
        }
    }
    else {
        var index = roles.indexOf(roleID);
        if (index > -1) {
            roles.splice(index, 1);
        }
    }
    var settings = { adminRoles: roles }
    return setSettings(guildID, settings);
}

async function getCommandChannel(guildID) {
    var settings = await getSettings(guildID);
    return settings.commandChannels;
}

async function setCommandChannel(guildID, cid, insert) {
    var channels = await getCommandChannel(guildID);
    if (insert) {
        if (!channels.includes(cid)) {
            channels.push(cid);
        }
    }
    else {
        var index = channels.indexOf(cid);
        if (index > -1) {
            channels.splice(index, 1);
        }
    }
    var settings = { commandChannels: channels }
    return setSettings(guildID, settings);
}

async function getJoinChannel(guildID) {
    var settings = await getSettings(guildID);
    return settings.joinChannels;
}

async function setJoinChannel(guildID, cid, insert) {
    var channels = await getJoinChannel(guildID);
    if (insert) {
        if (!channels.includes(cid)) {
            channels.push(cid);
        }
    }
    else {
        var index = channels.indexOf(cid);
        if (index > -1) {
            channels.splice(index, 1);
        }
    }
    var settings = { joinChannels: channels }
    return setSettings(guildID, settings);
}

async function isBlacklistedUser(userid, guildID) {
    var users = await getBlacklistedUser(guildID);
    return users.includes(userid);
}

async function getBlacklistedUser(guildID) {
    var settings = await getSettings(guildID);
    return settings.blacklistedUsers;
}

async function setBlacklistedUser(userid, guildID, insert) {
    var users = await getBlacklistedUser(guildID);
    if (insert) {
        if (!users.includes(userid)) {
            users.push(userid);
        }
    }
    else {
        var index = users.indexOf(userid);
        if (index > -1) {
            users.splice(index, 1);
        }
    }
    var settings = { blacklistedUsers: users }
    return setSettings(guildID, settings);
}
//TODO some time later , blacklist @everyone in these channels
async function getBlacklistedEveryone(guildID) {
    var settings = await getSettings(guildID);
    return settings.blacklistedEveryone;
}
async function setBlacklistedEveryone(guildID, cid, insert) {
}


async function joinsound(userid, surl, guildID) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db("MagiBot");
        if (await checks(userid, guildID)) {
            var update = { $set: { sound: surl } };
            await db.collection("users").updateOne({ userID: userid, guildID: guildID }, update);
        }
        mclient.close();
        return true;
    });
}

module.exports = {
    startup: async function (bot) {
        //create Collection
        await MongoClient.connect(url).then(async function (mclient) {
            var db = mclient.db('MagiBot');
            if (!(await db.collection("settings"))) {
                await db.createCollection("settings").then(() => {
                });
            }
            //Dataset of salt
            if (!db.collection("salt")) {
                db.createCollection("salt", function (err, res) {
                    if (err) throw err;
                });
            }
            if (!db.collection("saltrank")) {
                db.createCollection("saltrank", function (err, res) {
                    if (err) throw err;
                });
            }
            if (!db.collection("users")) {
                db.createCollection("users", function (err, res) {
                    if (err) throw err;
                });
            }
            if (!db.collection("votes")) {
                db.createCollection("votes", function (err, res) {
                    if (err) throw err;
                });
            }
            mclient.close();
        });
        //repeating functions:
        if (botStarted) {
            botStarted = false;
            onHour(bot, true);
            dblReminder(bot);
            voteCheck(bot);
        }
    },
    getUser: async function (userid, guildID) {
        let result = await getuser(userid, guildID);
        return result;
    },
    usageUp: async function (userid, guildID) {
        usageUp(userid, guildID);
    },
    saltUp: async function (userid1, userid2, G) {
        let ret = await saltUp(userid1, userid2, false, G.id);
        updateSaltKing(G);
        return ret;
    },
    saltUpAdmin: async function (userid1, userid2, G) {
        let ret = await saltUp(userid1, userid2, true, G.id);
        updateSaltKing(G);
        return ret;
    },
    getSalt: async function (userid, guildID) {
        return getSalt(userid, guildID);
    },
    getUsage: async function (userid, guildID) {
        let user = await getuser(userid, guildID);
        return parseInt(user.botusage);
    },
    remOldestSalt: async function (userid, G) {
        return MongoClient.connect(url).then(async function (mclient) {
            let guildID = G.id;
            let db = mclient.db('MagiBot');
            let id = await db.collection("salt").find({ salter: userid, guild: guildID }).sort({ date: 1 }).limit(1).toArray();
            if (id[0]) {
                await db.collection("salt").deleteOne({ _id: id[0]["_id"] });
                saltGuild(userid, guildID, -1);
                mclient.close();
                updateSaltKing(G);
                return true;
            } else {
                mclient.close();
                return false;
            }
        });
    },
    addGuild: async function (guildID) {
        if (await checkGuild(guildID)) {
        }
    },
    topSalt: async function (guildID) {
        return topSalt(guildID);
    },
    joinable: async function (guildID, cid) {
        let channels = await getJoinChannel(guildID);
        return channels.includes(cid);
    },
    isAdmin: async function (guildID, user, bot) {
        //checks for admin and Owner, they can always use
        if (user.hasPermission("ADMINISTRATOR", false, true, true)) {
            return true;
        }
        //Owner is always admin hehe
        if (user.id == bot.OWNERID) {
            return true;
        }
        var roles = await getAdminRole(guildID);
        for (var role in roles) {
            if (user.roles.has(roles[role])) {
                return true;
            }
        }
        return false;
    },
    isAdminRole: async (guildID, adminRole) => {
        var roles = await getAdminRole(guildID);
        for (var role in roles) {
            if (adminRole == roles[role]) {
                return true;
            }
        }
        return false;
    },
    commandAllowed: async function (guildID, cid) {
        var channels = await getCommandChannel(guildID);
        return (channels.length == 0 || channels.includes(cid));
    }, isCommandChannel: async function (guildID, cid) {
        var channels = await getCommandChannel(guildID);
        return channels.includes(cid);
    },
    commandChannel: async function (guildID) {
        var channels = await getCommandChannel(guildID);
        var out = "";
        for (var channel in channels) {
            out += " <#" + channels[channel] + ">"
        }
        return out;
    },
    getSound: async function (userid, guildID) {
        let user = await getuser(userid, guildID);
        return user.sound;
    },
    addSound: async function (userid, surl, guildID) {
        return joinsound(userid, surl, guildID);
    },
    isBlacklistedUser: async function (userID, guildID) {
        if (await checks(userID, guildID)) {
            return isBlacklistedUser(userID, guildID);
        }
        return false;
    },
    setJoinable: async function (guildID, channelID, insert) {
        return setJoinChannel(guildID, channelID, insert);
    },
    isJoinable: async (guildID, channelID) => {
        var channels = await getJoinChannel(guildID);
        return channels.includes(channelID);
    },
    setCommandChannel: async function (guildID, channelID, insert) {
        return setCommandChannel(guildID, channelID, insert);
    },
    setAdmin: async function (guildID, roleID, insert) {
        return setAdminRole(guildID, roleID, insert);
    },
    setBlacklistedUser: async function (guildID, userID, insert) {
        if (await checks(userID, guildID)) {
            return setBlacklistedUser(userID, guildID, insert);
        }
        return false;
    },
    getSettings: async function (guildID) {
        return getSettings(guildID);
    },
    clrSalt: async function (userid, G) {
        return MongoClient.connect(url).then(async function (mclient) {
            let guildID = G.id;
            let db = mclient.db('MagiBot');
            await db.collection("salt").deleteMany({ guild: guildID, salter: userid });
            saltGuild(userid, guildID, 1, true);
            mclient.close();
            updateSaltKing(G);
        });
    },
    resetSalt: async function (G) {
        await MongoClient.connect(url).then(async function (mclient) {
            let guildID = G.id;
            var db = await mclient.db('MagiBot');
            await db.collection("saltrank").deleteMany({ guild: guildID });
            await db.collection("salt").deleteMany({ guild: guildID });
            updateSaltKing(G);
            mclient.close();
        });
    },
    setNotification: async function (guildID, cid) {
        await setNotChannel(guildID, cid);
    },
    isNotChannel: async (guildID, channID) => {
        var notChann = await getNotChannel(guildID);
        return channID == notChann;
    },
    sendUpdate: async function (update, bot) {
        sendUpdate(update, bot);
    },
    getPrefixE: async function (guildID) {
        return getPrefix(guildID);
    },
    setPrefixE: async function (guildID, pref, bot) {
        await setPrefix(guildID, pref);
        bot.PREFIXES[guildID] = pref;
        return pref;
    },
    getPrefixesE: async function (bot) {
        bot.PREFIXES = {};
        var guilds = bot.guilds.array();
        for (let G in guilds) {
            bot.PREFIXES[guilds[G].id] = await getPrefix(guilds[G].id);
        }

    },
    toggleDBLE: async function (userID, add) {
        toggleDBL(userID, add);
    },
    getDBLE: async function (userID) {
        return isInDBL(userID);
    },
    addVote: async function (vote) {
        MongoClient.connect(url).then(async function (mclient) {
            let db = await mclient.db('MagiBot');
            db.collection("votes").insertOne(vote);
            mclient.close();
        });
    },
    toggleStillMuted: async function (userID, guildID, add) {
        toggleStillMuted(userID, guildID, add);
    },
    isStillMuted: async function (userID, guildID) {
        let find;
        await MongoClient.connect(url).then(async function (mclient) {
            let db = await mclient.db('MagiBot');
            find = await db.collection("stillMuted").findOne({ userid: userID, guildid: guildID });
            mclient.close();
        });
        return find;
    },
    getDBLSubs: async function () {
        return MongoClient.connect(url).then(async function (mclient) {
            let db = await mclient.db('MagiBot');
            let users = await db.collection("DBLreminder").find().toArray();
            mclient.close();
            return users;
        });
    }
};
