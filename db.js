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
            return true;
        });
    });
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
    //get newest entry in salt
    var d2;
    MongoClient.connect(url, function (err, mclient) {
        if (err) throw err;
        var db = mclient.db('MagiBot');
        d2 = db.collection("salt").find({ salter: userid1, reporter: userid2 }).sort({ date: -1 }).limit(1);
        mclient.close();
    });
    if (d2) {
        var d1 = new Date();
        return ((d2 - d1) / 1000 / 60 / 60 / 60) > 1;
    } else {
        return true;
    }
}

async function saltUp(userid1, userid2) {
    if (await saltDowntimeDone(userid1, userid2)) {
        return addSalt(userid1, userid2);
    } else {
        return false;
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
    saltUp: (userid1, userid2) => {
        if (checks(userid1) && checks(userid2)) {
            saltUp(userid1, userid2);
        }
    },
    //todo
    getSalt: async function f(userid) {
        console.log("salty bitch");
        if (checks(userid)) {
            let user = await getUser(userid);
            return parseInt(user.salt);
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
            updateUser(userid, { $set: { salt: 0 } });
        }
    }
};