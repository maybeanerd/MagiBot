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
    return MongoClient.connect(url).then(
        async function (mclient) {
            let db = mclient.db('MagiBot');
            let collection = db.collection('users');
            let userCount = (await collection.find(
                { _id: userid }).limit(1).count());
            mclient.close();
            return userCount > 0;
        });
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
        return MongoClient.connect(url).then(async function (mclient) {
            var db = mclient.db('MagiBot');
            var myobj = { _id: userid, warnings: 0, bans: 0, kicks: 0, botusage: 0 };
            return db.collection("users").insertOne(myobj).then(function (res) {
                console.log("1 User inserted");
                mclient.close();
                return true;
            });
        });
    }
}
async function addSalt(userid, reporter) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = mclient.db('MagiBot');
        let date = new Date();
        var myobj = { salter: userid, date: date, reporter: reporter };
        return db.collection("salt").insertOne(myobj).then(function (res) {
            console.log("1 Salter inserted");
            mclient.close();
            return 0;
        });
    });
    //return 1;
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
        mclient.close();
    });
}

//top 5 salty people
async function topSalt() {

}

async function getSalt(userid) {
    return MongoClient.connect(url).then(async function (mclient) {
        var db = await mclient.db('MagiBot');
        let res = await db.collection("salt").count({ salter: userid });
        //let res = await db.collection("salt").aggregate([{ $match: { salter: userid } }, { $group: { _id: null, count: { $sum: 1 } } }]).result; //was an idea
        console.log(res);
        mclient.close();
        if (res) {
            return res;
        } else {
            return 0;
        }
    });
}

async function saltUp(userid1, userid2) {
    let time = await saltDowntimeDone(userid1, userid2);
    if (time > 1) {
        return addSalt(userid1, userid2);
    } else {
        return time;
    }
}

async function usageUp(userid) {
    let user = await getUser(userid);
    var updateval;
    if (user.botusage) {
        updateval = user.botusage + 1
    } else {
        updateval = 1;
    }
    updateUser(userid, { $set: { botusage: (updateval) } });
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
        onHour();
    },
    addUser: (userid) => {
        checks(userid);
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