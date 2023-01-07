import { SlashCommandBuilder } from '@discordjs/builders';
import {
  ChatInputCommandInteraction,
  CommandInteraction,
  GuildMember,
} from 'discord.js';
import { MagibotSlashCommand } from '../types/command';

/**  definition of calculation of dice, use parse(input)
 returns array of throws with last index being sum,
 second last being multiplier and third last being add
 */
function comp(s: string, mI: string, nI: string, fI: string, aI: string) {
  const multiplier = parseInt(mI, 10) || 1;
  const numberOfRolls = parseInt(nI, 10) || 1;
  const amountOfSidesOnDie = parseInt(fI, 10);
  if (!amountOfSidesOnDie) {
    return false;
  }
  const additionModifier = typeof aI === 'string' ? parseInt(aI.replace(/\s/g, ''), 10) || 0 : 0;

  const throws: Array<number> = [];
  let sumOfRolls = 0;
  let overload = false;
  for (let i = 0; i < numberOfRolls; i++) {
    if (i > 21) {
      overload = true;
      break;
    }
    const tmp = Math.floor(Math.random() * amountOfSidesOnDie) + 1;
    throws.push(tmp);
    sumOfRolls += tmp;
  }

  const sumOfAllRollsAndModifiers = sumOfRolls * multiplier + additionModifier;

  return {
    throws,
    overload,
    multiplier,
    numberOfRolls,
    amountOfSidesOnDie,
    additionModifier,
    sumOfRolls,
    sumOfAllRollsAndModifiers,
  };
}

function parse(de: string) {
  // eslint-disable-next-line prefer-spread
  return comp.apply(
    null,
    de.match(/(?:(\d+)\s*\*\s*)?(\d*)d(\d+)(?:\s*([+-]\s*\d+))?/i) as any,
  );
}

const slashCommand = new SlashCommandBuilder()
  .setName('roll')
  .setDescription('Roll dice with DnD syntax, e.g.: 5*2d6+1')
  .setDMPermission(false)
  .addStringOption((option) => option
    .setName('dice')
    .setDescription(
      '[multiplier]*[number of rolls]d<die number>[+ <modifier>]',
    )
    .setRequired(true));

async function runCommand(
  interaction: CommandInteraction,
  input: string,
) {
  const diceRollCalculation = parse(input);
  if (!diceRollCalculation) {
    interaction.reply(
      `Your inputs could not be interpreted. Use the following format: 
\`[multiplier]*[number of rolls]d<die number>[+ <modifier>]\``,
    );
    return;
  }
  const {
    throws,
    multiplier,
    numberOfRolls,
    amountOfSidesOnDie,
    additionModifier,
    sumOfRolls,
    sumOfAllRollsAndModifiers,
  } = diceRollCalculation;
  const info: Array<{
    name: string;
    value: string;
    inline: boolean;
  }> = [];
  if (diceRollCalculation.overload) {
    interaction.reply('the dungeon master can only roll 22 dice at a time!');
    return;
  }
  info.push({
    name: `Sum of ${multiplier} * ${numberOfRolls}d${amountOfSidesOnDie} + ${additionModifier}`,
    value: String(sumOfAllRollsAndModifiers),
    inline: false,
  });
  info.push({
    name: 'Average roll',
    value: String(Math.floor(sumOfRolls / numberOfRolls)),
    inline: false,
  });
  info.push({
    name: 'Luckyness ( -50 to 50 % )',
    value: `${String(
      Math.floor((sumOfRolls / numberOfRolls / amountOfSidesOnDie) * 100) - 50,
    )}%`,
    inline: false,
  });
  throws.forEach((roll, i) => {
    info.push({
      name: `${i + 1}. roll`,
      value: String(roll),
      inline: true,
    });
  });
  const embed = {
    color: (interaction.member as GuildMember).displayColor,
    description: `:game_die: ${interaction.member}s dice have been rolled:`,
    fields: info,
    footer: {
      /* eslint-disable camelcase */
      icon_url:
        'https://cdn0.iconfinder.com/data/icons/video-game-items-concepts-line-art/128/dd-dice-512.png',
      /* eslint-enable camelcase */
      text: 'The real dungeon master',
    },
  };
  interaction.reply({ embeds: [embed] });
}

export const roll: MagibotSlashCommand = {
  permissions: [],
  async run(interaction: ChatInputCommandInteraction) {
    const input = interaction.options.getString('dice', true);
    return runCommand(interaction, input);
  },
  definition: slashCommand.toJSON(),
};
