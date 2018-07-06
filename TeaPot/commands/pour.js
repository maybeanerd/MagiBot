module.exports = {
    main: (bot, msg) => {
        let mem = await msg.guild.fetchMember(msg.author);
        mem.addRole("460218236185739264").catch(() => { });
    },
    ehelp: function (msg, bot) {
        return [{ name: "", value: "Subscribe to MagiBot news and other important pings on this server by getting the <@&460218236185739264> role." }];
    },
    perm: "SEND_MESSAGES,MANAGE_ROLES",
    admin: false,
    hide: false,
    category: "Utility"
};
