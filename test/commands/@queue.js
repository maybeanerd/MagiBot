﻿var used = {};
var data = require(__dirname + '/../db.js');
var cmds = require(__dirname + '/../bamands.js');


function messageEdit(voiceChannel, activeUser, qU, topic) {
    let msg = "Queue: **" + topic + "**";
    if (voiceChannel) {
        msg += "\n*with voicemode activated in* " + voiceChannel;
    }
    let tmpms = "";
    let count = 0;
    if (qU.length > 0) {
        for (let i in qU) {
            count++;
            let u = qU[i];
            if (!u || count > 10) {
                break;
            }
            tmpms += count + ". " + u + "\n";
        }
    } else {
        tmpms = " no more queued users\n";
    }
    msg += "\n\nCurrent user: **" + activeUser + "**\n*" + qU.length + " queued users left.*\n\nNext up are:" + tmpms + "\nUse ☑ to join and ❌ to leave the queue!";
    return msg;
}


module.exports = {
    main: async function (bot, msg) {
        var voiceChannel;
        if (used[msg.guild.id]) {
            var d = new Date();
            if ((d - used[msg.guild.id].date) <= 0) { //check if its already 2hours old
                if (used[msg.guild.id].msg && used[msg.guild.id].cid) {
                    var testchann = await msg.guild.channels.get(used[msg.guild.id].cid);
                    if (testchann && (await testchann.fetchMessage(used[msg.guild.id].msg).catch(() => { }))) {
                        msg.channel.send("There's already an ongoing queue on this guild. For performance reasons only one queue per guild is allowed.");
                        return;
                    }
                } else {
                    msg.channel.send("There's currently a queue being created on this guild. For performance reasons only one queue per guild is allowed.");
                    return;
                }
            }
        }
        used[msg.guild.id] = { date: new Date(Date.now() + 3600000) };
        let authorID = msg.author.id;
        msg.channel.send("What do you want the queue to be about?").then(mess => {
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
                        let authorMember = await msg.guild.fetchMember(msg.author);
                        voiceChannel = authorMember.voiceChannel;
                        let remMessage;
                        if (voiceChannel) {
                            let botMember = await msg.guild.fetchMember(bot.user);
                            if (!botMember.hasPermission("MUTE_MEMBERS")) {
                                remMessage = await msg.channel.send("If i had MUTE_MEMBERS permission i would be able to (un)mute users in the voice channel automatically. If you want to use that feature restart the command after giving me the additional permissions.");
                                voiceChannel = false;
                            } else {
                                if (await cmds.yesOrNo(msg, "Do you want to automatically (un)mute users based on their turn in " + voiceChannel + "? ")) {
                                    remMessage = await msg.channel.send("Automatically (un)muting users in " + voiceChannel + ". This means everyone except users that are considered admin by MagiBot is muted by default.");
                                } else {
                                    remMessage = await msg.channel.send("Deactivated automatic (un)muting in " + voiceChannel + ".");
                                    voiceChannel = false;
                                }
                            }
                        } else {
                            remMessage = await msg.channel.send("If you were in a voice channel while setting this up i could automatically (un)mute users. Restart the whole process to do so, if you wish to.");
                        }
                        msg.channel.send("Do you want to start the queue **" + topic + "** lasting **" + time + " minutes** ?").then(mess => {
                            const filter = (reaction, user) => {
                                return ((reaction.emoji.name == '☑' || reaction.emoji.name == '❌') && user.id == authorID);
                            };
                            mess.react('☑');
                            mess.react('❌');
                            mess.awaitReactions(filter, { max: 1, time: 20000 }).then(async function f(reacts) {
                                mess.delete();
                                remMessage.delete();
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
                                        used[msg.guild.id] = { date: new Date(Date.now() + time), cid: mess.channel.id, msg: mess.id };

                                        if (voiceChannel) {
                                            //add the vc to the global variable so joins get muted
                                            bot.queueVoiceChannels[msg.guild.id] = voiceChannel.id;
                                            //servermute all users in voiceChannel
                                            var memArray = voiceChannel.members.array();
                                            for (let mem in memArray) {
                                                mem = voiceChannel.members.get(memArray[mem].id);
                                                if (!(await data.isAdmin(msg.guild.id, mem, bot))) {
                                                    mem.setMute(true, "queue started in this voice channel");
                                                }
                                            }
                                        }

                                        collector.on('collect', async function (r) {
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
                                                                if (voiceChannel) {
                                                                    //unmute currentUser
                                                                    var currentMember = await msg.guild.fetchMember(activeUser);
                                                                    currentMember.setMute(false, "its your turn in the queue");
                                                                }
                                                            }
                                                            mess.edit(messageEdit(voiceChannel, activeUser, queuedUsers, topic));
                                                        }
                                                    }
                                                    break;
                                                case '➡':
                                                    if (queuedUsers[0]) {
                                                        if (voiceChannel) {
                                                            //mute old current user
                                                            var currentMember = await msg.guild.fetchMember(activeUser);
                                                            currentMember.setMute(true, "its not your turn in the queue anymore");
                                                        }
                                                        activeUser = queuedUsers.shift();
                                                        r.remove(activeUser);
                                                        mess.edit(messageEdit(voiceChannel, activeUser, queuedUsers, topic));
                                                        mess.reactions.get('☑').remove(activeUser);
                                                        msg.channel.send("It's your turn " + activeUser + "!").then((ms) => {
                                                            ms.delete(1000);
                                                        });
                                                        if (voiceChannel) {
                                                            //unmute currentUser
                                                            var currentMember = await msg.guild.fetchMember(activeUser);
                                                            currentMember.setMute(false, "its your turn in the queue");
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
                                                            mess.edit(messageEdit(voiceChannel, activeUser, queuedUsers, topic));
                                                        }
                                                    }
                                                    break;
                                                case '🔚':
                                                    msg.channel.send("Successfully ended queue.").then((ms) => {
                                                        ms.delete(5000);
                                                    });
                                                    collector.stop();
                                                    break;
                                                default:
                                                    break;
                                            }
                                        });
                                        collector.on('end', () => {
                                            deleteme.delete();
                                            used[msg.guild.id] = false;
                                            if (voiceChannel) {
                                                delete bot.queueVoiceChannels[msg.guild.id];
                                                //remove all mutes
                                                var memArray = voiceChannel.members.array();
                                                for (let mem in memArray) {
                                                    voiceChannel.members.get(memArray[mem].id).setMute(false, "queue ended");
                                                }
                                            }
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
        return [{ name: "", value: "Start a queue that can last up to 2h. There is only a single queue allowed per guild.\nYou can activate an optional voicemode which will automatically (un)mute users if you start the queue while connected to a voicechannel.\nYou get all the setup instructions when using the command." }];
    },
    admin: true,
    perm: ["SEND_MESSAGES", "MANAGE_MESSAGES"],
    dev: false,
    category: "Utility"
};
