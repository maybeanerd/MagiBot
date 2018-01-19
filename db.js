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
            console.log("Does User Exist?: ", userCount > 0);
            return userCount > 0;
        });
}

async function addUser(userid, guildID) {
    if (await existsUser(userid, guildID)) {
        console.log("addUser says User exists");
        return true;
    }
    else {
        console.log("addUser says trying to create a User in DB");
        return MongoClient.connect(url).then(async function (mclient) {
            var db = mclient.db(guildID);
            var myobj = { _id: userid, warnings: 0, bans: 0, kicks: 0, botusage: 0, sound: false };
            db.collection("users").insertOne(myobj);
            console.log("1 User inserted");
            mclient.close();
            return true;
        });
    }
}
async function addSalt(userid, reporter, guildID = 0) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db('MagiBot');
        let date = new Date();
        var myobj = { salter: userid, reporter: reporter, date: date, guild: guildID };
        return db.collection("salt").insertOne(myobj).then(function (res) {
            saltGuild(userid, guildID, 1);
            console.log("1 Salter inserted");
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
            console.log("1 document updated");
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
        console.log(d2);
        if (d2[0]) {
            let d1 = new Date();
            console.log(d2[0].date);
            console.log(d1);
            let ret = ((d1 - d2[0].date) / 1000 / 60 / 60);
            console.log(ret);
            return ret;
        } else {
            return 2;
        }
    });
}

//autmoatic deletion of reports and saltking evaluation: 
async function onHour() {
    var SaltkingRole = "387280939413274624";
    var d = new Date(),
        h = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1, 0, 0, 0),
        e = h - d;
    if (e > 100) { // some arbitrary time period
        setTimeout(onHour, e);
    }
    // my code
    await MongoClient.connect(url).then(async function (mclient) {
        let db = mclient.db('MagiBot');
        let nd = new Date();
        nd.setDate(nd.getDate() - 14);
        db.collection("salt").remove({ date: { $lt: nd } });
        /*
        //get highest salter
        let saltkingId;

        for (G in await bot.guilds) {
            if (await G.available) {
                for (M in await G.members) {
                    M.removeRole(SaltkingRole);
                    if (M.id == saltkingId) {
                        M.addRole(SaltkingRole);
                    }
                }
            }
        }*/
        mclient.close();
    });
}

//top 5 salty people
async function topSalt(guildID) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db(guildID);
        var result = await db.collection("saltrank").find().sort({ salt: -1 }).limit(5).toArray();
        if (!result) {
            return [];
        }
        mclient.close();
        return result;
    });
}

async function getSalt(userid, guildID = 0) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db(guildID);
        var result = await db.collection("saltrank").findOne({ salter: userid });
        if (!result) {
            return 0;
        }
        mclient.close();
        return result.salt;
    });
}

async function saltUp(userid1, userid2, ad, guildID = 0) {
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
        if (await !db.collection("settings")) {
            await db.createCollection("settings").then(() => {
                console.log("Settings Collection created!");
            });
        }
        if (!db.collection("users")) {
            db.createCollection("users", function (err, res) {
                if (err) throw err;
                console.log("User Collection created!");
            });
        }
        //Dataset of saltranking
        if (!db.collection("saltrank")) {
            db.createCollection("saltrank", function (err, res) {
                if (err) throw err;
                console.log("Saltrank Collection created!");
            });
        }
        return true;
    });
}

//TODO
async function guildSettings(guildID, settings) {

}

function saltGuild(salter, guildID, add = 1) {
    MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db(guildID);
        var user = await db.collection("saltrank").findOne({ salter: salter });
        if (!user) {
            var myobj = { salter: salter, salt: 1 };
            await db.collection("saltrank").insertOne(myobj);
        } else {
            let slt = user.salt + add;
            if (slt < 0) { slt = 0; }
            var update = { $set: { salt: slt } };
            await db.collection("saltrank").updateOne({ salter: salter }, update);
        }
        mclient.close();
    });
}

//TODO
async function getSettings(guildID) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db(guildID);
        let result = await db.collection("settings").toArray();
        mclient.close();
        return result;
    });
}
//TODO
async function getAdminRole(guildID) {
    var admins = ["186032268995723264"]; //TODO add DB access
    return admins;
}
//TODO
async function getCommandChannel(guildID) {
    var channels = ["198764451132997632", "402946769190780939", "382233880469438465"];
    return channels;
}
//TODO
async function getJoinChannel(guildID) {
    return ["195175213367820288", "218859225185648640", "347741043485048842", "402798475709906944"];
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
    startup: () => {
        //create Collection
        MongoClient.connect(url, function (err, mclient) {
            if (err) throw err;
            var db = mclient.db('MagiBot');
            //data about commands (usage count)
            if (!db.collection("commands")) {
                db.createCollection("commands", function (err, res) {
                    if (err) throw err;
                    console.log("Command Collection created!");
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
        onHour();
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
    saltUp: async function (userid1, userid2, guildID = 0) {
        if (await checks(userid1, guildID) && await checks(userid2, guildID) && await checkGuild(guildID)) {
            return saltUp(userid1, userid2, false, guildID);
        }
    },
    saltUpAdmin: async function (userid1, userid2, guildID = 0) {
        if (await checks(userid1, guildID) && await checks(userid2, guildID) && await checkGuild(guildID)) {
            return saltUp(userid1, userid2, true, guildID);
        }
    },
    getSalt: async function (userid, guildID = 0) {
        console.log("salty bitch");
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
    remOldestSalt: async function (userid, guildID = 0) {
        if (await checks(userid, guildID) && await checkGuild(guildID)) {
            return MongoClient.connect(url).then(async function (mclient) {
                let db = mclient.db('MagiBot');
                let id = await db.collection("salt").find({ salter: userid }).sort({ date: 1 }).limit(1).toArray();
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
            console.log(guild.name + " was added!");
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
    }
};
