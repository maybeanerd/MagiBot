var used = {};

module.exports = {
    main: async function (bot, msg) {
        var voiceChannel;
        if (used[msg.guild.id]) {
            var d = new Date();
            if ((d - used[msg.guild.id]) <= 0) { //check if its already 2hours old
                msg.channel.send("There's already an ongoing queue on this guild. For performance reasons only one queue per guild is allowed.");
                return;
            }
        }
        used[msg.guild.id] = new Date(Date.now() + 3600000);
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
                    msg.channel.awaitMessages(m => m.author.id == authorID, { max: 1, time: 60000 }).then(async function (collected) {
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
                        //TODO add optional voice channel 
                        let authorMember = await msg.guild.fetchMember(msg.author);
                        voiceChannel = authorMember.voiceChannel;
                        //moreTODO move all of the methods here somehow
                        if (voiceChannel) {
                            //moreTODO test for MANAGE_CHANNELS permission
                            let botMember = await msg.guild.fetchMember(bot.user);
                            if (!botMember.hasPermission("MANAGE_CHANNELS")) {
                                voiceChannel = false;
                            } else {
                                voiceChannel.overwritePermissions(msg.guild.id, { "SPEAK": false }, "muted for the queue command");
                            }
                        }
                        //endTODO
                        msg.channel.send("Do you want to start the queue **" + topic + "** lasting **" + time + " minutes** ?").then(mess => {
                            const filter = (reaction, user) => {
                                return ((reaction.emoji.name == '☑' || reaction.emoji.name == '❌') && user.id == authorID);
                            };
                            mess.react('☑');
                            mess.react('❌');
                            mess.awaitReactions(filter, { max: 1, time: 20000 }).then(async function f(reacts) {
                                mess.delete();
                                if (reacts.first() && reacts.first().emoji.name == '☑') {
                                    msg.channel.send("Queue: **" + topic + ":**\n\nUse ☑ to join the queue!").then(async function f(mess) {
                                        let chann = bot.channels.get("433357857937948672");
                                        await mess.react('➡');
                                        await mess.react('☑');
                                        await mess.react('❌');
                                        await mess.react('🔚');
                                        var fil = (reaction, user) => {
                                            return (reaction.emoji.name == '☑' || reaction.emoji.name == '❌' || ((reaction.emoji.name == '➡' || reaction.emoji.name == '🔚') && user.id == authorID));
                                        };
                                        time *= 60000;
                                        var queuedUsers = [];
                                        var activeUser = false;
                                        const collector = mess.createReactionCollector(fil, { time: time });
                                        let deleteme = await chann.send("Started queue **" + topic + "** on server **" + mess.guild + "**");
                                        used[msg.guild.id] = new Date(Date.now() + time);

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
                                                                mess.reactions.get('❌').remove(user);
                                                            } else {
                                                                activeUser = user;
                                                                r.remove(activeUser);
                                                                msg.channel.send("It's your turn " + activeUser + "!").then((ms) => {
                                                                    ms.delete(1000);
                                                                });
                                                            }
                                                            mess.edit("Queue: **" + topic + "**\n\nCurrent user: **" + activeUser + "**\n*" + queuedUsers.length + " queued users left.*\n\nUse ☑ to join and ❌ to leave the queue!");
                                                        }
                                                    }
                                                    break;
                                                case '➡':
                                                    if (queuedUsers[0]) {
                                                        if (voiceChannel) {
                                                            voiceChannel.overwritePermissions(activeUser, { "SPEAK": false }, "muted for the queue command");
                                                        }
                                                        activeUser = queuedUsers.shift();
                                                        r.remove(activeUser);
                                                        mess.edit("Queue: **" + topic + "**\n\nCurrent user: **" + activeUser + "**\n*" + queuedUsers.length + " queued users left.*\n\nUse ☑ to join and ❌ to leave the queue!");
                                                        mess.reactions.get('☑').remove(activeUser);
                                                        msg.channel.send("It's your turn " + activeUser + "!").then((ms) => {
                                                            ms.delete(1000);
                                                        });
                                                        if (voiceChannel) {
                                                            voiceChannel.overwritePermissions(activeUser, { "SPEAK": true }, "unmuted for the queue command");
                                                        }
                                                    } else {
                                                        msg.channel.send("No users left in queue.").then((ms) => {
                                                            ms.delete(2000);
                                                        });
                                                    }
                                                    r.remove(authorID);
                                                    break;
                                                case '❌':
                                                    let sers = r.users;
                                                    sers = sers.array();
                                                    for (let u in sers) {
                                                        let user = sers[u];
                                                        if (queuedUsers.includes(user) && user.id != bot.user.id) {
                                                            r.remove(user);
                                                            mess.reactions.get('☑').remove(user);
                                                            let ind = queuedUsers.findIndex(obj => obj.id == user.id);
                                                            queuedUsers.splice(ind, 1);
                                                            mess.edit("Queue: **" + topic + "**\n\nCurrent user: **" + activeUser + "**\n*" + queuedUsers.length + " queued users left.*\n\nUse ☑ to join and ❌ to leave the queue!");
                                                        }
                                                    }
                                                    break;
                                                case '🔚':
                                                    msg.channel.send("Successfully ended queue.");
                                                    collector.stop();
                                                    break;
                                                default:
                                                    break;
                                            }
                                        });
                                        collector.on('end', () => {
                                            deleteme.delete();
                                            used[msg.guild.id] = false;
                                            mess.edit("**" + topic + "** ended.").catch(() => { });
                                            mess.clearReactions().catch(() => { });
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
        return [{ name: "", value: "Start a queue that can last up to 2h. There is only a single queue allowed per guild.\nYou get instructions when using the command." }];
    },
    admin: true,
    perm: ["SEND_MESSAGES", "MANAGE_MESSAGES"],
    dev: false,
    category: "Utility"
};
