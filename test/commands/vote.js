var reactions = ["🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮", "🇯", "🇰", "🇱", "🇲", "🇳", "🇴", "🇵", "🇶", "🇷", "🇸", "🇹"];

function getTime(d, ad, h, ah, m, am) {
    d = parseInt(d);
    if (isNaN(d)) {
        d = 0;
    }
    h = parseInt(h);
    if (isNaN(h)) {
        h = 0;
    }
    m = parseInt(m);
    if (isNaN(m)) {
        m = 0;
    }
    if (d + h + m > 0) {
        if (!ad) {
            h = d;
            d = 0;
        }
        if (!ah) {
            m = h;
            h = 0;
        }
        return [d, h, m];
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
                    msg.channel.send("How long is this vote supposed to last? *(use d h m format)*").then(mess => {
                        msg.channel.awaitMessages(m => m.author.id == authorID, { max: 1, time: 60000 }).then(collected => {
                            if (collected.first()) {
                                //time as array of values
                                let time = getTime.apply(this, collected.first().content.match(/^(?=.*[hmd]$)(\d*)(d\s*)?(\d*)(h\s*)?(\d*)(m\s*)?$/));
                                msg.channel.send(time);
                                //do checks on time validity


                                //use time later to create a new date
                                collected.first().delete();
                                mess.delete();
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
                                                msg.channel.send("Do you want to start the vote **" + topic + "** lasting **" + time + " minutes** with the options\n" + str).then(mess => {
                                                    const filter = (reaction, user) => {
                                                        return ((reaction.emoji.name == '☑' || reaction.emoji.name == '❌') && user.id === authorID);
                                                    };
                                                    mess.react('☑');
                                                    mess.react('❌');
                                                    mess.awaitReactions(filter, { max: 1, time: 20000 }).then(reacts => {
                                                        mess.delete();
                                                        if (reacts.first() && reacts.first().emoji.name == '☑') {
                                                            msg.channel.send("**Vote: **\n" + topic + "\n\n**Options:**\n" + str).then(async function f(vote) {
                                                                for (var i in args) {
                                                                    await vote.react(reactions[i]);
                                                                }
                                                                //TODO add vote to DB, it will then be automatically evaluated
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
        msg.channel.send("Just type `" + bot.PREFIXES[msg.guild.id] + ".vote` and follow the instructions.");
    },
    help: 'Start a vote',
    admin: false,
    hide: false, //TODO perms
    dev: true
};
