var MongoClient = require('mongodb').MongoClient;

var url = "mongodb://T0TProduction:yourpassword@magibot-shard-00-00-1nbod.mongodb.net:27017,magibot-shard-00-01-1nbod.mongodb.net:27017,magibot-shard-00-02-1nbod.mongodb.net:27017/test?ssl=true&replicaSet=MagiBot-shard-0&authSource=admin";
/*MongoClient.connect(url, function (err, mclient) {
    console.log("Database created!");
    mclient.close();
});*/

//Define Methods:
async function getUser(userid) {
    let mclient = await MongoClient.connect(url);
    try {
        //do stuff
        var db = mclient.db('MagiBot');
        let result = await db.collection("users").findOne({ _id: userid });
        return result;
    } finally {
        mclient.close();
    }
}

async function existsUser(userid) {
    let mclient = await MongoClient.connect(url);
    try {
        let db = mclient.db('MagiBot');
        let collection = db.collection('users');
        let userCount = (await collection.find(
            { _id: userid }).limit(1).count());
        return userCount > 0;
    } finally {
        mclient.close();
    }
}

async function template(data) {
    let mclient = await MongoClient.connect(url);
    try {
        //do stuff

    } finally {
        mclient.close();
    }
}

async function addUser(userid) {
    if (existsUser(userid)) {
        return true;
    }
    else {
        MongoClient.connect(url, function (err, mclient) {
            if (err) throw err;
            var db = mclient.db('MagiBot');
            var myobj = { _id: userid, warnings: 0, bans: 0, kicks: 0, botusage: 0 };
            db.collection("users").insertOne(myobj, function (err, res) {
                if (err) throw err;
                console.log("1 User inserted");
                mclient.close();
                return true;
            });
        });
    }
}
async function addSalt(userid, reporter) {
    MongoClient.connect(url, function (err, mclient) {
        if (err) throw err;
        var db = mclient.db('MagiBot');
        let date = new Date();
        var myobj = { salter: userid, date: date, reporter: reporter };
        db.collection("salt").insertOne(myobj, function (err, res) {
            if (err) throw err;
            console.log("1 Salter inserted");
            mclient.close();
            return 0;
        });
    });
    return 1;
}
async function updateUser(userid, update) {
    MongoClient.connect(url, function (err, mclient) {
        if (err) throw err;
        var db = mclient.db('MagiBot');
        db.collection("users").updateOne({ _id: userid }, update, function (err, res) {
            if (err) throw err;
            console.log("1 document updated");
            mclient.close();
        });
    });
}

async function saltDowntimeDone(userid1, userid2) {
    //TODO Returning undefined
    //get newest entry in salt
    return MongoClient.connect(url).then(async function (mclient) {
        let db = mclient.db('MagiBot');
        let d2 = await db.collection("salt").find({ salter: userid1, reporter: userid2 }).sort({ date: -1 }).limit(1).toArray();
        mclient.close();
        console.log(d2);
        if (d2) {
            let d1 = new Date();
            let ret = ((d1 - d2[0].date) / 1000 / 60 / 60 / 60);
            console.log(ret);
            return ret;
        } else {
            return 2;
        }
    });
}

async function getSalt(userid) {
    MongoClient.connect(url, async function (err, mclient) {
        if (err) throw err;
        var db = await mclient.db('MagiBot');
        console.log(await db.collection("salt").find({ salter: userid }).sort({ date: -1 }).limit(1).toArray());
        //gives undefined needs fix
        let res = await db.collection("salt").aggregate({ $group: { _id: '$salter', salt: { $sum: 1 } } }).result;
        console.log(res);
        mclient.close();
        if (res) {
            return res[userid].salt;
        } else {
            return 0;
        }
    });
}

async function saltUp(userid1, userid2) {
    let time = await saltDowntimeDone(userid1, userid2);
    console.log(time);
    if (time > 1) {
        return addSalt(userid1, userid2);
    } else {
        return time;
    }
}

async function usageUp(userid) {
    let user = await getUser(userid);
    await updateUser(userid, { $set: { botusage: (parseInt(user.botusage) + 1) } });
}

async function checks(userid) {
    //maybe add more checks
    if (addUser(userid)) {
        return true;
    }
    //else
    return false;
}


module.exports = {
    startup: () => {
        //create Collection
        MongoClient.connect(url, function (err, mclient) {
            if (err) throw err;
            var db = mclient.db('MagiBot');
            //data about users (bans,warnings,etc.)
            if (!db.collection("users")) {
                db.createCollection("users", function (err, res) {
                    if (err) throw err;
                    console.log("User Collection created!");
                });
            }
            //data about commands (usage count)
            if (!db.collection("commands")) {
                db.createCollection("commands", function (err, res) {
                    if (err) throw err;
                    console.log("Command Collection created!");
                });
            }
            if (!db.collection("sounds")) {
                db.createCollection("sounds", function (err, res) {
                    if (err) throw err;
                    console.log("Sound Collection created!");
                });
            }
            //Dataset of settings (whitelist channels, etc.)
            if (!db.collection("settings")) {
                db.createCollection("settings", function (err, res) {
                    if (err) throw err;
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
    },
    addUser: (userid) => {
        if (checks(userid)) {
            addUser(userid);
        }
    },
    getUser: async function f(userid) {
        if (checks(userid)) {
            let result = await getUser(userid);
            return result;
        }
    },
    usageUp: (userid) => {
        if (checks(userid)) {
            usageUp(userid);
        }
    },
    saltUp: async function f(userid1, userid2) {
        if (checks(userid1) && checks(userid2)) {
            return saltUp(userid1, userid2);
        }
    },
    getSalt: async function f(userid) {
        console.log("salty bitch");
        if (checks(userid)) {
            return getSalt(userid);
        }
    },
    getUsage: async function f(userid) {
        if (checks(userid)) {
            let user = await getUser(userid);
            return parseInt(user.botusage);
        }
    },
    //todo
    resetSalt: (userid) => {
        if (checks(userid)) {
            //todo reset salt
        }
    }
};