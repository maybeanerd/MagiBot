var reactions = ["🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮", "🇯", "🇰", "🇱", "🇲", "🇳", "🇴", "🇵", "🇶", "🇷", "🇸", "🇹"];
var data = require(__dirname + '/../db.js');

function getTime(content) {
    let regex = /^(?:(\d+)d\s*?)?(?:(\d+)h\s*?)?(?:(\d+)m\s*?)?$/;
    let matched = content.match(regex);
    if (matched) {
        let d = parseInt(matched[1]);
        let h = parseInt(matched[2]);
        let m = parseInt(matched[3]);
        if (isNaN(d)) {
            d = 0;
        }
        if (isNaN(h)) {
            h = 0;
        }
        if (isNaN(m)) {
            m = 0;
        }
        if (d + h + m > 0) {
            return [d, h, m];
        } else return false;
    } else return false;
}

module.exports = {
    main: function (bot, msg) {
        let authorID = msg.author.id;
        msg.channel.send("What do you want the vote to be about?").then(mess => {
            msg.delete();
            msg.channel.awaitMessages(m => m.author.id == authorID, { max: 1, time: 60000 }).then(collected => {
                if (collected.first()) {
                    let topic = collected.first().content;
                    collected.first().delete();
                    mess.delete();
                    msg.channel.send("How long is this vote supposed to last? (use d h m format, e.g.: `2d 3h 5m`)").then(mess => {
                        msg.channel.awaitMessages(m => m.author.id == authorID, { max: 1, time: 60000 }).then(collected => {
                            if (collected.first() && collected.first().content) {
                                //time as array of values
                                let time = getTime(collected.first().content);
                                collected.first().delete();
                                mess.delete();
                                //do checks on time validity
                                if (!time) {
                                    msg.channel.send("Please use a valid time.");
                                    return;
                                }
                                if (time[0] > 7 || time[0] > 6 && (time[1] > 0 || time[2] > 0)) {
                                    msg.channel.send("Votes are not allowed to last longer than 7 days, please use a valid time.");
                                    return;
                                }
                                msg.channel.send("What do you want the options to be for **" + topic + "**? Use `option1|option2[|etc...]`").then(mess => {
                                    msg.channel.awaitMessages(m => m.author.id == authorID, { max: 1, time: 60000 }).then(collected => {
                                        if (collected.first()) {
                                            const args = collected.first().content.split("|");
                                            collected.first().delete();
                                            mess.delete();
                                            if (args[0] && args.length <= 20) {
                                                let str = "";
                                                for (let a in args) {
                                                    str += reactions[a] + " " + args[a] + "\n";
                                                }
                                                var timestr = "";
                                                var times = ["days ", "hours ", "minutes "];
                                                for (var s in time) {
                                                    if (time[s] > 0) {
                                                        timestr += time[s] + " " + times[s];
                                                    }
                                                }
                                                msg.channel.send("Do you want to start the vote **" + topic + "** lasting **" + timestr + "**with the options\n" + str).then(mess => {
                                                    const filter = (reaction, user) => {
                                                        return ((reaction.emoji.name == '☑' || reaction.emoji.name == '❌') && user.id === authorID);
                                                    };
                                                    mess.react('☑');
                                                    mess.react('❌');
                                                    mess.awaitReactions(filter, { max: 1, time: 20000 }).then(reacts => {
                                                        mess.delete();
                                                        if (reacts.first() && reacts.first().emoji.name == '☑') {
                                                            let dat = new Date();
                                                            let date = new Date(dat.getFullYear(), dat.getMonth(), dat.getDate() + time[0], dat.getHours() + time[1], dat.getMinutes() + time[2], dat.getSeconds(), 0);
                                                            msg.channel.send("**" + topic + "**\n*ends on " + date + "*\n\n" + str).then(async function f(ms) {
                                                                for (var i in args) {
                                                                    await ms.react(reactions[i]);
                                                                }
                                                                //vote structure
                                                                var vote = { messageID: ms.id, channelID: ms.channel.id, options: args, topic: topic, date: date };
                                                                data.addVote(vote);
                                                            });
                                                        } else if (reacts.first()) {
                                                            msg.channel.send("successfully canceled vote **" + topic + "**");
                                                        } else {
                                                            msg.channel.send("canceled vote due to timeout.");
                                                        }
                                                    });
                                                });
                                            } else {
                                                if (!args) {
                                                    msg.channel.send("Please try again and add some options");
                                                } else {
                                                    msg.channel.send("There are only up to 20 options allowed, please try again with less options");
                                                }
                                            }
                                        } else {
                                            msg.channel.send("canceled vote due to timeout.");
                                        }
                                    });
                                });
                            } else {
                                msg.channel.send("canceled vote due to timeout.");
                            }
                        });
                    });
                } else {
                    msg.channel.send("canceled vote due to timeout.");
                }
            });
        });
    },
    ehelp: function (msg, bot) {
        return [{ name: "", value: "Start a vote with up to 20 different options. The maximum duration is 7 days.\nThe setup includes multiple steps which will be explained when you use the command." }]
    },
    help: 'Start a vote',
    admin: false,
    hide: false,
    perm: ["SEND_MESSAGES", "MANAGE_MESSAGES"],
    category: "Utility"
};
