var data = require(__dirname + '/../db.js');
var cmds = require(__dirname + '/../bamands.js');

module.exports = {
    main: async function f(bot, msg) {
        if (msg.guild) {
            var id;
            const args = msg.content.split(/ +/);
            var mention = args[0];
            id = await cmds.findMember(msg.guild, mention);
            if (!id && !mention) {
                id = msg.author.id;
            } else if (!id) {
                msg.reply(" you need to define the user uniquely or not mention any user. For more help use `" + bot.PREFIXES[msg.guild.id] + ".help profile`");
                return;
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
            let user = await msg.guild.fetchMember(id);
            let embed = {
                color: user.displayColor,
                description: ("Here's some info on " + user.displayName),
                fields: info,
                thumbnail: { url: user.user.avatarURL },
                footer: {
                    icon_url: user.user.avatarURL,
                    text: user.user.tag
                }
            }
            msg.channel.send('', { embed });
        } else {
            msg.reply("This command is only available in guilds.");
        }
    },
    help: 'Get some info on yourself or a user you mention',
    ehelp: async function (msg, bot) { msg.channel.send("Use `" + bot.PREFIXES[msg.guild.id] + ".profile` to get info about yourself or `" + bot.PREFIXES[msg.guild.id] + ".profile @user/userid/nickname` to get info about a certain user. If you use the nickname you need to at least define three characters."); },
    perm: "SEND_MESSAGES",
    admin: false,
    hide: false
};
