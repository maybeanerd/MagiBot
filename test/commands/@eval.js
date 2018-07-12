
module.exports = {
    main: async (bot, msg)=> {
        var expression = new String(msg.content);
let evaluation= await eval(expression.toString()); //is the toString needed?
        msg.channel.send("input:\n```js\n" + expression + "```");

        msg.channel.send("output:\n```js\n" + evaluation + "```");
    },
    help: 'eval something',
    admin: true,
    dev: true,
    hide: true,
    perm: "SEND_MESSAGES",
    category: "Admin Command"
};
