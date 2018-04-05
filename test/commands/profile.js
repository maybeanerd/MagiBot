var data = require(__dirname + '/../db.js');

module.exports = {
    main: async function f(bot, msg) {
        if (msg.guild) {
            var id;
            const args = msg.content.split(/ +/);
            var mention = args[0];
            if (mention.length > 0) {
                if (mention.startsWith('<@') && mention.endsWith('>')) {
                    id = mention.substr(2).slice(0, -1);
                    if (id.startsWith('!')) {
                        id = id.substr(1);
                    }
                } else {
                    msg.reply("your mention did not work. Use `" + bot.PREFIX + "!help profile` for more info.");
                    return;
                }
            } else {
                id = msg.author.id;
            }
            var info = [];
            var salt = await data.getSalt(id, msg.guild.id);
            var usage = await data.getUsage(id, msg.guild.id);
            info.push({
                name: "Saltlevel",
                value: salt,
                inline: false
            });
            info.push({
                name: "Bot usage",
                value: usage,
                inline: false
            });
            let link = await data.getSound(id, msg.guild.id);
            info.push({
                name: "Joinsound",
                value: link,
                inline: false
            });
            let user = await bot.fetchUser(id);
            let embed = {
                color: bot.COLOR,
                description: ("Here's some info on " + user.username),
                fields: info,
                footer: {
                    icon_url: user.avatarURL,
                    text: user.username
                }
            }
            msg.channel.send('', { embed });
        } else {
            msg.reply("This command is only available in guilds.");
        }
    },
    help: 'Get some info on yourself or a user you mention',
    ehelp: async function (msg, bot) { msg.channel.send("Use `" + bot.PREFIX + "!profile` to get info about yourself or `" + bot.PREFIX + "!profile @user` to get info about a certain user."); },
    perm: "SEND_MESSAGES",
    admin: false,
    hide: false
};
