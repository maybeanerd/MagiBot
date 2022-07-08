import axios from 'axios';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { COLOR, user } from '../shared_assets';
import { DeferReply, MagibotSlashCommand } from '../types/command';

// we needed to manually type this because the inferred type collided with date type later on
const options: { weekday: 'long'; month: 'long'; day: 'numeric' } = {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
};

async function main(interaction: CommandInteraction) {
  const now = new Date();
  const incomingFact = await axios.get<string>(
    `http://numbersapi.com/${now.getMonth() + 1}/${now.getDate()}/date`,
  );
  const fact = incomingFact.data;
  if (!fact) {
    interaction.followUp('Something went wrong whilst contacting the API...');
    return;
  }
  const embed = {
    color: COLOR,
    // fields: info,
    title: `Random fact about: \`${now.toLocaleDateString('en-US', options)}\``,
    description: fact,
    footer: {
      /* eslint-disable camelcase */
      iconURL: user().avatarURL() || '',
      /* eslint-enable camelcase */
      text: 'powered by numbersapi.com',
    },
  };
  interaction.followUp({ embeds: [embed] });
}
const slashCommand = new SlashCommandBuilder()
  .setName('randomfact')
  .setDescription('Get a random fact of the day.');

export const randomfact: MagibotSlashCommand = {
  permissions: [],
  async run(interaction: CommandInteraction) {
    return main(interaction);
  },
  definition: slashCommand.toJSON(),
  defer: DeferReply.public,
};
