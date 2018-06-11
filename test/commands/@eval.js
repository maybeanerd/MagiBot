
module.exports = {
    main: function (bot, msg) {
        var expression = new String(msg.content);
        msg.channel.send("```js\n" + eval(expression.toString()) + "```");
    },
    help: 'eval something',
    admin: true,
    dev: true,
    hide: true,
    perm: ["SEND_MESSAGES", "MANAGE_MESSAGES"],
    category: "Admin Command"
};
