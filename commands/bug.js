
module.exports = {
    main: async function (bot, msg) {
        if (!((await msg.content.length) > 0)) {
            msg.reply("you need to add info about the report after the command.")
            return;
        }
        chann = await msg.guild.channels.get("414809410448261132");
        chann.send("**Bugreport by " + await msg.author.username + ":**\n" + await msg.content).then(mes => {
            msg.reply("succesfully sent bugreport:\n\n" + mes.content)
        });

    },
    admin: false,
    help: 'Report a bug concerning MagiBot',
    hide: false,
    dev: false
};
