import { COLOR, PREFIXES } from '../shared_assets';
import { commandCategories } from '../types/enums';

/**  definition of calculation of dice, use parse(input)
 returns array of throws with last index being sum,
 second last being multiplier and third last being add
 */
function comp(s, mI, nI, fI, aI) {
  const m = parseInt(mI, 10) || 1;
  const n = parseInt(nI, 10) || 1;
  const f = parseInt(fI, 10);
  if (!f) {
    return false;
  }
  const a = typeof aI === 'string' ? parseInt(aI.replace(/\s/g, ''), 10) || 0 : 0;

  const ret: Array<number | boolean> = [];
  let r = 0;
  let overload = false;
  for (let i = 0; i < n; i++) {
    if (i > 21) {
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
  ret.push(r * m + a);

  return ret;
}
function parse(de: string) {
  // eslint-disable-next-line prefer-spread
  return comp.apply(
    null,
    de.match(/(?:(\d+)\s*\*\s*)?(\d*)d(\d+)(?:\s*([+-]\s*\d+))?/i) as any,
  );
}

export const roll: magibotCommand = {
  name: 'roll',
  hide: false,
  dev: false,
  main(content, msg) {
    const args = content.split(/ +/);
    const input = args[0];

    const throws = parse(input);
    if (!throws) {
      msg.channel.send(
        `Your inputs could not be interpreted. Use \`${
          PREFIXES[msg.guild!.id]
        }.help roll\` for more info.`,
      );
      return;
    }
    const info: Array<{
      name: string;
      value: string;
      inline: boolean;
    }> = [];
    const size = throws.length;
    if (throws[size - 6]) {
      msg.reply('the dungeon master can only roll 22 dice at a time!');
    }
    let thro = throws[size - 4] as number;
    if (thro > 22) {
      thro = 22;
    }
    info.push({
      name: `Sum of ${throws[size - 5]} * ${thro}d${throws[size - 3]} + ${
        throws[size - 2]
      }`,
      value: String(throws[size - 1]),
      inline: false,
    });
    info.push({
      name: 'Average roll',
      value: String(Math.floor((throws[size - 1] as number) / thro)),
      inline: false,
    });
    info.push({
      name: 'Luckyness ( -50 to 50 % )',
      value: `${String(
        Math.floor(
          ((throws[size - 1] as number) / thro / (throws[size - 3] as number))
            * 100,
        ) - 50,
      )}%`,
      inline: false,
    });
    for (let i = 0; i < size - 6; i++) {
      info.push({
        name: `${i + 1}. roll`,
        value: String(throws[i]),
        inline: true,
      });
    }
    const embed = {
      color: COLOR,
      description: `:game_die: <@!${msg.author.id}>s dice have been rolled:`,
      fields: info,
      footer: {
        /* eslint-disable camelcase */
        icon_url:
          'https://cdn0.iconfinder.com/data/icons/video-game-items-concepts-line-art/128/dd-dice-512.png',
        /* eslint-enable camelcase */
        text: 'The real dungeon master',
      },
    };
    msg.channel.send('', { embed });
  },
  ehelp() {
    const ret: Array<{ name: string; value: string }> = [];
    ret.push({
      name: '[multiplier]*[number of rolls]d<die number>[+ <modifier>]',
      value:
        'Roll dice with standard DnD syntax.\nExamples:\n`5*2d6+1`,`3d6 + 12`, `4*d12 + 3`, `d100`',
    });
    return ret;
  },
  perm: 'SEND_MESSAGES',
  admin: false,
  category: commandCategories.fun,
};
