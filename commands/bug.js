
module.exports = {
    main: async function (bot, msg) {

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
