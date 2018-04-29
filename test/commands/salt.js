var data = require(__dirname + '/../db.js');
var cmds = require(__dirname + '/../bamands.js');


function printHelp(msg, bot) {
    var info = [];

    info.push({
        name: "add @User/userid/nickname",
        value: "Report a user being salty. If you use nickname it has to be at least three characters long",
        inline: true
    });
    info.push({
        name: "top",
        value: "Displays the top 5 salter of " + msg.guild.name,
        inline: true
    });

    let embed = {
        color: bot.COLOR,
        description: "Commands available via the prefix `" + bot.PREFIXES[msg.guild.id] + ".salt`:",
        fields: info,
        footer: {
            icon_url: bot.user.avatarURL,
            text: bot.user.username
        }
    }

    msg.channel.send('', { embed });
}

module.exports = {
    main: async function f(bot, msg) {
        const args = msg.content.split(/ +/);
        var command = args[0].toLowerCase();
        if (msg.guild) {
            switch (command) {
                case 'add':
                    var mention = args[1];
                    let uid = cmds.findMember(msg.guild, mention);
                    if (mention && uid) {
                        if (uid == bot.user.id) {
                            msg.reply("you can't report me!");
                            return;
                        }
                        if (uid == msg.author.id) {
                            msg.reply("you can't report yourself!");
                            return;
                        }
                        let time = await data.saltUp(uid, msg.author.id, msg.guild);
                        console.log(time);
                        if (time == 0) {
                            msg.channel.send("Successfully reported <@!" + uid + "> for being a salty bitch!");
                        } else {
                            msg.reply("you can report <@!" + uid + "> again in " + (59 - Math.floor((time * 60) % 60)) + " min and " + (60 - Math.floor((time * 60 * 60) % 60)) + " sec!");
                        }
                    } else {
                        msg.reply("you need to mention a user you want to report!");
                    }
                    break;
                case "top": var salters = await data.topSalt(msg.guild.id);
                    var info = [];
                    for (var i = 0; i < 5; i++) {
                        let mname = "User left guild";
                        if (salters[i]) {
                            let member = await msg.guild.fetchMember(salters[i].salter).catch((err) => { });
                            if (member) {
                                mname = member.displayName;
                            }
                            info.push({
                                name: (i + 1) + ". place: " + mname,
                                value: salters[i].salt + " salt",
                                inline: false
                            });
                        } else { break; }
                    }
                    let embed = {
                        color: 0xffffff,
                        description: "Top 5 salter in " + msg.guild.name + ":",
                        fields: info,
                        footer: {
                            icon_url: await msg.guild.iconURL,
                            text: await msg.guild.name
                        }
                    }
                    msg.channel.send('', { embed });
                    break;
                default:
                    msg.reply("this command doesn't exist. Use `" + bot.PREFIXES[msg.guild.id] + ".help salt` for more info.");
                    break;
            }
        } else {
            msg.reply("commands are only functional when used in a guild.");
        }

    },
    help: "Salt commands",
    ehelp: async function (msg, bot) { printHelp(msg, bot); },
    perm: "SEND_MESSAGES",
    admin: false,
    hide: false
};
