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
        console.log(result);
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
    console.log("trying to add an user");
    if (existsUser(userid)) {
        console.log("This User already exists lol");
        return true;
    }
    else {
        MongoClient.connect(url, function (err, mclient) {
            if (err) throw err;
            var db = mclient.db('MagiBot');
            var myobj = { _id: userid, salt: 0, warnings: 0, bans: 0, kicks: 0, botusage: 0 };
            db.collection("users").insertOne(myobj, function (err, res) {
                if (err) throw err;
                console.log("1 User inserted");
                mclient.close();
                return true;
            });
        });
    }
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

async function saltUp(userid) {
    let user = await getUser(userid);
    await updateUser(userid, { $set: { salt: (parseInt(user.salt) + 1) } });
}

async function usageUp(userid) {
    let user = await getUser(userid);
    await updateUser(userid, { $set: { botusage: (parseInt(user.botusage) + 1) } });
}

async function OwnerStartup() {
    await addUser(bot.OWNERID);
    updateUser(bot.OWNERID, { $set: { salt: 0 } }).then(saltUp(bot.OWNERID));
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
            mclient.close();
        });
    },
    addUser: (userid) => {
        if (checks(userid)) {
            addUser(userid);
        }
    },
    getUser: (userid) => {
        if (checks(userid)) {
            return getUser(userid);
        }
    },
    startup: () => {
        if (checks(userid)) {
            OwnerStartup();
        }
    },
    usageUp: (userid) => {
        if (checks(userid)) {
            usageUp(userid);
        }
    },
    saltUp: (userid) => {
        if (checks(userid)) {
            saltUp(userid);
        }
    },
    getSalt: (userid) => {
        if (checks(userid)) {
            return parseInt(getUser(userid).salt);
        }
    },
    resetSalt: (userid) => {
        if (checks(userid)) {
            updateUser(userid, { $set: { salt: 0 } });
        }
    }
};