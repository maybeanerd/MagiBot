//definition of calculation of dice, use parse(input)
//returns array of throws with last index being sum, second last being multiplier and third last being add
function comp(s, m, n, f, a) {
    m = parseInt(m);
    if (isNaN(m)) m = 1;
    n = parseInt(n);
    if (isNaN(n)) n = 1;
    f = parseInt(f);
    if (isNaN(f)) {
        return false;
    }
    a = typeof (a) == 'string' ? parseInt(a.replace(/\s/g, '')) : 0;
    if (isNaN(a)) a = 0;
    //ab hier selber ändern, array von würfen als ausgabe?
    var ret = [];
    var r = 0;
    for (var i = 0; i < n; i++) {
        var tmp = Math.floor(Math.random() * f);
        ret.push(tmp);
        r += tmp;
    }
    ret.push(m);
    ret.push(n);
    ret.push(f);
    ret.push(a);
    ret.push(r * m + a);

    return ret;
};
function parse(de) {
    return comp.apply(this, de.match(/(?:(\d+)\s*\*\s*)?(\d*)d(\d+)(?:\s*([\+\-]\s*\d+))?/i));
}

module.exports = {
    main: function (bot, msg) {
        var input = msg.content.split(" ")[0];
        var throws = parse(input);
        if (!throws) {
            msg.channel.send("Du hast keine akzeptablen Parameter übergeben. Für Hilfe nutze " + bot.PREFIX + "!help roll.");
            return;
        }
        var info = [];
        let size = throws.length;
        info.push({
            name: throws[size - 1],
            value: "Gesamtergebnis mit " + throws[size - 5] + "*" + throws[size - 4] + "d" + throws[size - 3] + " + " + throws[size - 2],
            inline: true
        });
        for (let i = 0; i < size - 5; i++) {
            info.push({
                name: throws[i],
                value: "Wurf " + (i + 1),
                inline: false
            });
        }
        let embed = {
            color: bot.COLOR,
            description: "Dein Würfelergebnis:",
            fields: info,
            footer: {
                icon_url: bot.user.avatarURL,
                text: bot.user.username
            }
        }
        msg.channel.send('', { embed });
    },
    help: 'Werfe Würfel',
    ehelp: function (bot, msg) {
        msg.channel.send("Lasse botnameTODO für dich würfeln. Dabei kannst du 3d6 + 12, 4*d12 + 3, d100 verwenden");
    },
    admin: false,
};
