
module.exports = {
    main: function (bot, msg) {
       var expression = new String(msg.content);
msg.channel.send("```js"+eval(expression.toString())+"```");
    },
    help: 'eval something',
    admin: true,
    dev:true,
    hide: false,
    perm: ["SEND_MESSAGES", "MANAGE_MESSAGES"],
    category: "Admin Command"
};
