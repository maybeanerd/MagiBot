var used = {};

module.exports = {
    main: function (bot, msg) {
        if (used[msg.guild.id]) {
            msg.channel.send("There's already an ongoing queue on this guild. For performance reasons only one queue per guild is allowed.");
            return;
        }
        used[msg.guild.id] = true;
        let authorID = msg.author.id;
        msg.channel.send("What do you want the queue to be about?").then(mess => { //fix when no messages TODO
            msg.delete();
            msg.channel.awaitMessages(m => m.author.id == authorID, { max: 1, time: 60000 }).then(collected => {
                if (!collected.first()) {
                    msg.channel.send("Cancelled queue creation due to timeout.");
                    used[msg.guild.id] = false;
                    return;
                }
                let topic = collected.first().content;
                collected.first().delete();
                mess.delete();
                msg.channel.send("How long is this queue supposed to last? *(in minutes, maximum of 120)*").then(mess => {
                    msg.channel.awaitMessages(m => m.author.id == authorID, { max: 1, time: 60000 }).then(collected => {
                        if (!collected.first()) {
                            msg.channel.send("Cancelled queue creation due to timeout.");
                            used[msg.guild.id] = false;
                            return;
                        }
                        let time = parseInt(collected.first().content);
                        if (isNaN(time)) {
                            msg.channel.send("Thats not a real number duh. Cancelled queue creation, try again.");
                            used[msg.guild.id] = false;
                            return;
                        }
                        if (time > 120) {
                            time = 120;
                        } else if (time < 1) {
                            time = 1;
                        }
                        collected.first().delete();
                        mess.delete();
                        msg.channel.send("Do you want to start the queue **" + topic + "** lasting **" + time + " minutes** ?").then(mess => {
                            const filter = (reaction, user) => {
                                return ((reaction.emoji.name == '☑' || reaction.emoji.name == '❌') && user.id == authorID);
                            };
                            mess.react('☑');
                            mess.react('❌');
                            mess.awaitReactions(filter, { max: 1, time: 20000 }).then(reacts => {
                                mess.delete();
                                if (reacts.first() && reacts.first().emoji.name == '☑') {
                                    msg.channel.send("**" + topic + ":**\nUse ☑ to join the queue!").then(mess => {
bot.channels.get("433357857937948672").then((chann)=>{
    chann.send("Started queue "+topic+" on server "+mess.guild );
)};
                                        mess.react('➡');
                                        mess.react('☑');
                                        mess.react('❌');
                                        var fil = (reaction, user) => {
                                            return (reaction.emoji.name == '☑' || ((reaction.emoji.name == '❌' || reaction.emoji.name == '➡') && user.id == authorID));
                                        };
                                        time *= 60000;
                                        var queuedUsers = []; //save queued users
                                        var activeUser = false;
                                        const collector = mess.createReactionCollector(fil, { time: time });


                                        collector.on('collect', r => {
                                            switch (r.emoji.name) {
                                                case '☑':
                                                    let users = r.users;
                                                    users = users.array();
                                                    for (let u in users) {
                                                        let user = users[u];
                                                        if (!queuedUsers.includes(user) && user != activeUser && user.id != bot.user.id) {
                                                            if (activeUser) {
                                                                queuedUsers.push(user);
                                                            } else {
                                                                activeUser = user;
                                                                r.remove(activeUser);
                                                            }
                                                            mess.edit("**" + topic + "**\nCurrent user: **" + activeUser + "**\n*" + queuedUsers.length + " queued users left.*\nUse ☑ to join the queue!");
                                                        }
                                                    }
                                                    break;
                                                case '➡':
                                                    if (queuedUsers[0]) {
                                                        activeUser = queuedUsers.shift();
                                                        r.remove(activeUser);
                                                        mess.edit("**" + topic + "**\nCurrent user: **" + activeUser + "**\n*" + queuedUsers.length + " queued users left.*\nUse ☑ to join the queue!");
                                                    } else {
                                                        msg.channel.send("No users left in queue.").then((ms) => {
                                                            ms.delete(5000);
                                                        });
                                                    }
                                                    r.remove(authorID);
                                                    break;
                                                case '❌':
                                                    msg.channel.send("Successfully canceled queue **" + topic + "**");
                                                    collector.stop();
                                                default:
                                                    break;
                                            }
                                        });
                                        collector.on('end', () => {
                                            msg.channel.send("**" + topic + "** ended.");
bot.channels.get("433357857937948672").then((chann)=>{
    chann.send("Ended queue "+topic+" on server "+mess.guild );
)};
                                            used[msg.guild.id] = false;
                                            return;
                                        });
                                    });
                                } else if (reacts.first()) {
                                    msg.channel.send("successfully canceled queue **" + topic + "**");
                                    used[msg.guild.id] = false;
                                    return;
                                }
                            });
                        });



                    });
                });
            });
        });
    },
    ehelp: function (msg, bot) {
        msg.channel.send("Type `" + bot.PREFIX + ":queue` and follow the instructions to start a queue where people can enlist in.");
    },
    help: 'Start a queue',
    admin: true,
    perm: ["SEND_MESSAGES", "MANAGE_MESSAGES"],
    dev: false
};
