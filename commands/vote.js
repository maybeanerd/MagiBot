module.exports = {
    main: function (bot, msg) {
        if (msg.content.split(/ +/)[0] == "help") {
            msg.channel.send("Just type `" + bot.PREFIX + "!qvote` and follow the instructions.");
        } else {
            let authorID = msg.author.id;
            msg.channel.send("What do you want the vote to be about?").then(mess => {
                msg.delete();
                msg.channel.awaitMessages(m => m.author.id == authorID, { max: 1, time: 60000 }).then(collected => {
                    let topic = collected.first().content;
                    collected.first().delete();
                    mess.delete();
                    msg.channel.send("How long is this vote supposed to last? *(in minutes, maximum of 60)*").then(mess => {
                        msg.channel.awaitMessages(m => m.author.id == authorID, { max: 1, time: 60000 }).then(collected => {
                            let time = parseInt(collected.first().content);
                            if (time > 60) {
                                time = 60;
                            } else if (time < 1) {
                                time = 1;
                            }
                            collected.first().delete();
                            mess.delete();
                            msg.channel.send("What do you want the options to be for **" + topic + "**? Use `option1|option2[|etc...]`").then(mess => {
                                msg.channel.awaitMessages(m => m.author.id == authorID, { max: 1, time: 60000 }).then(collected => {
                                    const args = collected.first().content.split("|");
                                    collected.first().delete();
                                    mess.delete();
                                    if (args[0]) {
                                        let str = "";
                                        for (let a in args) {
                                            str += args[a] + "\n";
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
                                                    msg.channel.send("**Vote: **\n" + topic + "\n\n**Options:**\n" + str).then(vote => { //TODO add emoji to options
                                                        let fil = () => { return false; }//TODO add filter
                                                        time *= 60000;
                                                        //vote.awaitReactions(fil, { max: 1, time: time }).then(reacts => {
                                                        //do something with the votes

                                                        //TODO add vote to DB, it will then be automatically evaluated

                                                        //});
                                                    });
                                                } else if (reacts.first()) {
                                                    msg.channel.send("successfully canceled vote **" + topic + "**");
                                                }
                                            });
                                        })
                                    } else {
                                        msg.channel.send("Please try again and add some options");
                                    }
                                });
                            });
                        });
                    });
                });
            });
        };

    },
    help: 'Start a vote',
    admin: false,
    dev: true
};
