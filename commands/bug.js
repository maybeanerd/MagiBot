
module.exports = {
    main: async function (bot, msg) {
        if (!((await msg.content.length) > 0)) {
            msg.reply("you need to add info about the report after the command. Use `k!help bug` to get more info.")
            return;
        }
        let chann = await bot.channels.get("414809410448261132");
        chann.send("**Bugreport** by " + await msg.author.username + " (<@" + msg.author.id + ">) on server " + msg.guild.name + "( " + msg.guild.id + " ) :\n" + await msg.content).then(mes => {
            msg.reply("succesfully sent bugreport:\n\n" + mes.content)
        });

    },
    admin: false,
    help: 'Report a bug concerning MagiBot',
    ehelp: async function (msg, bot) { msg.channel.send("To report a bug use `k!bug <bugreport with information about what you did, what was expected, and what went wrong>`."); },
    hide: false,
    dev: false
};
