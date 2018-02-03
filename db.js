var MongoClient = require('mongodb').MongoClient;
var config = require(__dirname + '/token.js'); /*use \\ as path on Win and / on Unix*/

var url = config.dburl;

//Define Methods:
async function getUser(userid, guildID) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db(guildID);
        let result = await db.collection("users").findOne({ _id: userid });
        mclient.close();
        return result;
    });
}

async function existsUser(userid, guildID) {
    return MongoClient.connect(url).then(
        async function (mclient) {
            let db = mclient.db(guildID);
            let userCount = await db.collection("users").find({ _id: userid }).count();
            mclient.close();
            return userCount > 0;
        });
}

async function addUser(userid, guildID) {
    if (await existsUser(userid, guildID)) {
        return true;
    }
    else {
        return MongoClient.connect(url).then(async function (mclient) {
            var db = mclient.db(guildID);
            var myobj = { _id: userid, warnings: 0, bans: 0, kicks: 0, botusage: 0, sound: false };
            db.collection("users").insertOne(myobj);
            mclient.close();
            return true;
        });
    }
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
        var db = mclient.db(guildID);
        db.collection("users").updateOne({ _id: userid }, update, function (err, res) {
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

//autmoatic deletion of reports and saltking evaluation: 
async function onHour(bot) {
    var SaltkingRole = "387280939413274624";
    var d = new Date(),
        h = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1, 0, 0, 0),
        e = h - d;
    if (e > 100) { // some arbitrary time period
        setTimeout(onHour.bind(null, bot), e);
    }
    // my code
    await MongoClient.connect(url).then(async function (mclient) {
        let db = mclient.db('MagiBot');
        let nd = new Date();
        nd.setDate(nd.getDate() - 14);
        db.collection("salt").remove({ date: { $lt: nd } });

        //TODO test if this works on callback
        var guilds = bot.guilds.array();
        for (let guild in guilds) {
            //getting DB for guild
            let guildID = await guilds[guild].id;
            var dbTwo = await mclient.db(guildID);

            //TODO iterate through users
            var users = await dbTwo.collection("saltrank").find().toArray();
            for (var user in users) {
                let userID = users[user].id;
                let removeData = await db.collection("salt").remove({ date: { $lt: nd }, guild: guildID, salter: userID });
                let slt = user.salt - removeData.nRemoved;
                await dbTwo.collection("saltrank").updateOne({ salter: userID }, { $set: { salt: slt } });
            }
        }


        //TODO delete salt in ranking every 2 weeks
        //maybe use object from remove 
        //or delete before removing

        /* Saltking stuff TODO
                for (G in await bot.guilds) {
                    let saltkingID = getSaltKing(G.id);
        
                    if (await G.available) {
                        for (M in await G.members) {
                            M.removeRole(SaltkingRole);
                            if (M.id == saltkingId) {
                                M.addRole(SaltkingRole);
                            }
                        }
                    }
                }
                */

        mclient.close();
    });
}

//top 5 salty people
async function topSalt(guildID) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db(guildID);
        var result = await db.collection("saltrank").find().sort({ salt: -1 }).limit(5).toArray();
        mclient.close();
        if (!result) {
            return [];
        }
        return result;
    });
}

async function getSalt(userid, guildID) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db(guildID);
        var result = await db.collection("saltrank").findOne({ salter: userid });
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
    let user = await getUser(userid, guildID);
    var updateval;
    if (user.botusage) {
        updateval = user.botusage + 1
    } else {
        updateval = 1;
    }
    updateUser(userid, { $set: { botusage: (updateval) } }, guildID);
}

async function checks(userid, guildID) {
    //maybe add more checks
    if (await addUser(userid, guildID)) {
        return true;
    }
    //else
    return false;
}

async function checkGuild(id) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = await mclient.db(id);
        //Dataset for settings
        if (!(await db.collection("settings"))) {
            await db.createCollection("settings").then(() => {
                console.log("Settings Collection created!");
            });
        }
        if (!(await db.collection("users"))) {
            db.createCollection("users", function (err, res) {
                if (err) throw err;
                console.log("User Collection created!");
            });
        }
        //Dataset of saltranking
        if (!(await db.collection("saltrank"))) {
            db.createCollection("saltrank", function (err, res) {
                if (err) throw err;
                console.log("Saltrank Collection created!");
            });
        }
        mclient.close();
        if (await getSettings(id)) {
            return true;
        } else {
            return false;
        }
    });
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
        await db.collection("settings").insertOne({ _id: guildID, commandChannels: [], adminRoles: [], joinChannels: [], blacklistedUsers: [], blacklistedEveryone: [], saltKing: false });
        var ret = await db.collection("settings").findOne({ _id: guildID });
        mclient.close();
        return ret;
    });
}
//TODO
async function getSaltKing(guildID) {
    var settings = await getSettings(guildID);
    return settings.saltKing;
}
//TODO
async function setSaltKing(guildID, userID) {
    setSettings(guildID, { saltKing: userID });
}


async function saltGuild(salter, guildID, add = 1, reset = false) {
    MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db(guildID);
        var user = await db.collection("saltrank").findOne({ salter: salter });
        if (!user) {
            var myobj = { salter: salter, salt: 1 };
            await db.collection("saltrank").insertOne(myobj);
        } else {
            let slt = user.salt + add;
            if (slt < 0 || reset) { slt = 0; }
            var update = { $set: { salt: slt } };
            await db.collection("saltrank").updateOne({ salter: salter }, update);
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
        var db = mclient.db(guildID);
        var user = await db.collection("users").findOne({ _id: userid });
        if (await checks(user, guildID)) {
            var update = { $set: { sound: surl } };
            await db.collection("users").updateOne({ _id: userid }, update);
        }
        mclient.close();
        return true;
    });
}

module.exports = {
    startup: async function (bot) {
        //create Collection
        MongoClient.connect(url).then(async function (mclient) {
            var db = mclient.db('MagiBot');
            //data about commands (usage count)
            if (!(await db.collection("commands"))) {
                db.createCollection("commands", function (err, res) {
                    if (err) throw err;
                    console.log("Command Collection created!");
                });
            }
            if (!(await db.collection("settings"))) {
                await db.createCollection("settings").then(() => {
                    console.log("Settings Collection created!");
                });
            }
            //Dataset of salt
            if (!db.collection("salt")) {
                db.createCollection("salt", function (err, res) {
                    if (err) throw err;
                    console.log("Salt Collection created!");
                });
            }
            mclient.close();
        });
        onHour(bot);
    },

    addUser: (userid) => {
        checks(userid);
    },
    getUser: async function (userid, guildID) {
        if (await checks(userid, guildID)) {
            let result = await getUser(userid, guildID);
            return result;
        }
    },
    usageUp: async function (userid, guildID) {
        if (await checks(userid, guildID)) {
            usageUp(userid, guildID);
        }
    },
    saltUp: async function (userid1, userid2, guildID) {
        if (await checks(userid1, guildID) && await checks(userid2, guildID) && await checkGuild(guildID)) {
            return saltUp(userid1, userid2, false, guildID);
        }
    },
    saltUpAdmin: async function (userid1, userid2, guildID = 0) {
        if (await checks(userid1, guildID) && await checks(userid2, guildID) && await checkGuild(guildID)) {
            return saltUp(userid1, userid2, true, guildID);
        }
    },
    getSalt: async function (userid, guildID) {
        if (await checks(userid, guildID) && await checkGuild(guildID)) {
            return getSalt(userid, guildID);
        }
    },
    getUsage: async function (userid, guildID) {
        if (await checks(userid, guildID)) {
            let user = await getUser(userid, guildID);
            return parseInt(user.botusage);
        }
    },
    resetSalt: async function (userid, guildID) {
        if (await checks(userid, guildID)) {
            return MongoClient.connect(url).then(async function (mclient) {
                let db = mclient.db('MagiBot');
                await db.collection("salt").remove({ salter: userid });
                mclient.close();
                return true;
            });
        } else {
            return false;
        }
    },
    remOldestSalt: async function (userid, guildID) {
        if (await checks(userid, guildID) && await checkGuild(guildID)) {
            return MongoClient.connect(url).then(async function (mclient) {
                let db = mclient.db('MagiBot');
                let id = await db.collection("salt").find({ salter: userid, guild: guildID }).sort({ date: 1 }).limit(1).toArray();
                if (id[0]) {
                    await db.collection("salt").deleteOne({ _id: id[0]["_id"] });
                    saltGuild(userid, guildID, -1);
                    mclient.close();
                    return true;
                } else {
                    mclient.close();
                    return false;
                }
            });
        } else {
            return false;
        }

    },
    addGuild: async function (guildID) {
        if (await checkGuild(guildID)) {
        }
    },
    topSalt: async function (guildID) {
        if (await checkGuild(guildID)) {
            return topSalt(guildID);
        }
    },
    joinable: async function (guildID, cid) {
        let channels = await getJoinChannel(guildID);
        return channels.includes(cid);
    },
    isAdmin: async function (guildID, user) {
        //checks for admin and Owner, they can always use
        if (user.hasPermission("ADMINISTRATOR", false, true, true)) {
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
    commandAllowed: async function (guildID, cid) {
        var channels = await getCommandChannel(guildID);
        if (channels.includes(cid)) {
            return true;
        }
        return false;
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
        if (await checks(userid, guildID)) {
            let user = await getUser(userid, guildID);
            if (user.sound) {
                return user.sound;
            } else {
                return false;
            }
        }
    },
    addSound: async function (userid, surl, guildID) {
        return joinsound(userid, surl, guildID);
    },
    isBlacklistedUser: async function (userID, guildID) {
        if (await checks(userID, guildID) && await checkGuild(guildID)) {
            return isBlacklistedUser(userID, guildID);
        }
        return false;
    },
    setJoinable: async function (guildID, channelID, insert) {
        if (await checkGuild(guildID)) {
            return setJoinChannel(guildID, channelID, insert);
        }
        return false;
    },
    setCommandChannel: async function (guildID, channelID, insert) {
        if (await checkGuild(guildID)) {
            return setCommandChannel(guildID, channelID, insert);
        }
        return false;
    },
    setAdmin: async function (guildID, roleID, insert) {
        if (await checkGuild(guildID)) {
            return setAdminRole(guildID, roleID, insert);
        }
        return false;
    },
    setBlacklistedUser: async function (guildID, userID, insert) {
        if (await checkGuild(guildID) && checks(userID, guildID)) {
            return setBlacklistedUser(userID, guildID, insert);
        }
        return false;
    },
    getSettings: async function (guildID) {
        return getSettings(guildID);
    }
};
