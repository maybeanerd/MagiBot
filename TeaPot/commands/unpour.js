module.exports = {
    main: async function (bot, msg) {
        let mem = await msg.guild.fetchMember(msg.author);
        mem.removeRole("460218236185739264").catch(() => { });
        msg.reply("successfully removed the role.");
    },
    ehelp: function (msg, bot) {
        return [{ name: "", value: "Get rid of your <@&460218236185739264> role." }];
    },
    perm: ["SEND_MESSAGES", "MANAGE_ROLES"],
    admin: false,
    hide: false,
    category: "Utility"
};
