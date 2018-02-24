var data = require(__dirname + '/../db.js');

function printHelp(msg, bot) {
    var info = [];

    info.push({
        name: "del @User",
        value: "Delete the joinsound of a user",
        inline: true
    });

    let embed = {
        color: bot.COLOR,
        description: "Commands available via the prefix `" + bot.PREFIX + "@sound` :",
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
        var mention = args[1];
        switch (command) {
            case 'del':
                if (mention.startsWith('<@') && mention.endsWith('>')) {
                    mention = mention.substr(2).slice(0, -1);
                    if (mention.startsWith('!')) {
                        mention = mention.substr(1);
                    }
                    if (await data.addSound(mention, false, msg.guild.id)) {
                        msg.reply("you successfully removed <@!" + mention + ">s joinsound!");
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
                msg.reply("this command doesn't exist. Use `" + bot.PREFIX + "@help sound` for more info.");
                break;
        }

    },
    help: 'Modify the joinsounds of other users',
    ehelp: async function (msg, bot) { printHelp(msg, bot); },
    perm: "SEND_MESSAGES",
    admin: true,
    hide: false
};
