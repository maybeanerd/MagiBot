// definition of calculation of dice, use parse(input)
// returns array of throws with last index being sum, second last being multiplier and third last being add
function comp(s, m, n, f, a) {
  m = parseInt(m, 10);
  if (isNaN(m)) m = 1;
  n = parseInt(n, 10);
  if (isNaN(n)) n = 1;
  f = parseInt(f, 10);
  if (isNaN(f)) {
    return false;
  }
  a = typeof a === 'string' ? parseInt(a.replace(/\s/g, ''), 10) : 0;
  if (isNaN(a)) a = 0;
  // ab hier selber ändern, array von würfen als ausgabe?
  const ret = [];
  let r = 0;
  let overload = false;
  for (let i = 0; i < n; i++) {
    if (i > 23) {
      overload = true;
      break;
    }
    const tmp = Math.floor(Math.random() * f) + 1;
    ret.push(tmp);
    r += tmp;
  }
  ret.push(overload);
  ret.push(m);
  ret.push(n);
  ret.push(f);
  ret.push(a);
  ret.push((r * m) + a);

  return ret;
}
function parse(de) {
  return comp.apply(this, de.match(/(?:(\d+)\s*\*\s*)?(\d*)d(\d+)(?:\s*([+-]\s*\d+))?/i));
}

module.exports = {
  main(bot, msg) {
    const args = msg.content.split(/ +/);
    const input = args[0];

    const throws = parse(input);
    if (!throws) {
      msg.channel.send(`Your inputs could not be interpreted. Use \`${bot.PREFIXES[msg.guild.id]}.help roll\` for more info.`);
      return;
    }
    const info: Array<{
      name: string;
      value: string;
      inline: boolean;
    }> = [];
    const size = throws.length;
    if (throws[size - 6]) {
      msg.reply('the dungeon master can only roll 24 dice at a time!');
    }
    let thro = throws[size - 4];
    if (thro > 24) {
      thro = 24;
    }
    info.push({
      name: `Sum of ${throws[size - 5]} * ${thro}d${throws[size - 3]} + ${throws[size - 2]}`,
      value: throws[size - 1],
      inline: false,
    });
    for (let i = 0; i < size - 6; i++) {
      info.push({
        name: `${i + 1}. roll`,
        value: throws[i],
        inline: true,
      });
    }
    const embed = {
      color: bot.COLOR,
      description: `:game_die: <@!${msg.author.id}>s dice have been rolled:`,
      fields: info,
      footer: {
        /* eslint-disable camelcase */
        icon_url: 'https://cdn0.iconfinder.com/data/icons/video-game-items-concepts-line-art/128/dd-dice-512.png',
        /* eslint-enable camelcase */
        text: 'The real dungeon master',
      },
    };
    msg.channel.send('', { embed });
  },
  ehelp() {
    const ret = [];
    ret.push({
      name: '[multiplier]*[number of rolls]d<die number>[+ <modifier>]',
      value: 'Roll dice with standard DnD syntax.\nExamples:\n`5*2d6+1`,`3d6 + 12`, `4*d12 + 3`, `d100`',
    });
    return ret;
  },
  perm: 'SEND_MESSAGES',
  admin: false,
  category: 'Fun',
};
