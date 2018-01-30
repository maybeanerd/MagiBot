//definition of calculation of dice, use parse(input)
function comp(s, m, n, f, a) {
	m = parseInt(m);
	if (isNaN(m)) m = 1;
	n = parseInt(n);
	if (isNaN(n)) n = 1;
	f = parseInt(f);
	if (isNaN(f)) {
		//command falsch verwendet!
	}
	a = typeof (a) == 'string' ? parseInt(a.replace(/\s/g, '')) : 0;
	if (isNaN(a)) a = 0;
	var r = 0;
	//ab hier selber ändern, array von würfen als ausgabe?
	for (var i = 0; i < n; i++)
		r += Math.floor(Math.random() * f);
	return r * m + a;
};
function parse(de) {
	return comp.apply(this, de.match(/(?:(\d+)\s*\*\s*)?(\d*)d(\d+)(?:\s*([\+\-]\s*\d+))?/i));
}

module.exports = {
	main: function (bot, msg) {

		msg.channel.send("Für Hilfe nutze " + bot.PREFIX + "!help roll.");
	},
	help: 'Werfe Würfel',
	ehelp: function (bot, msg) {
		msg.channel.send("Lasse botnameTODO für dich würfeln. Dabei kannst du 3d6 + 12, 4*d12 + 3, d100 verwenden");
	},
	admin: false,
};
