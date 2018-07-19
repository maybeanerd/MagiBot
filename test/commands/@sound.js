var data = require(__dirname + '/../db.js');
var cmds = require(__dirname + '/../bamands.js');

function printHelp(msg, bot) {
    var info = [];

    info.push({
        name: "rem <@User|userid|nickname>",
        value: "Remove the joinsound of a user. If you use nickname it has to be at least three characters long",
    });

    return info;
}


module.exports = {
    main: async function f(bot, msg) {
        const args = msg.content.split(/ +/);
        var command = args[0].toLowerCase();
        var mention = args[1];
        switch (command) {
            case 'rem':
                let uid = await cmds.findMember(msg.guild, mention);
                if (mention && uid) {
                    if (await data.addSound(uid, false, msg.guild.id)) {
                        msg.reply("you successfully removed <@!" + uid + ">s joinsound!");
                    }
                    else {
                        msg.reply("Aaaaaand you failed.");
                    }
                } else {
                    msg.reply("you need to mention a user you want to use this on!");
                    return;
                }
                break;
            default:
                msg.reply("this command doesn't exist. Use `" + bot.PREFIXES[msg.guild.id] + ":help sound` for more info.");
                break;
        }

    },
    help: 'Modify the joinsounds of other users',
    ehelp: function (msg, bot) { return printHelp(msg, bot); },
    perm: "SEND_MESSAGES",
    admin: true,
    hide: false,
    category: "Utility"
};
