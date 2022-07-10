import { REST } from '@discordjs/rest';
import {
  RESTPostAPIApplicationCommandsJSONBody,
  Routes,
} from 'discord-api-types/v10';
import {
  globalApplicationCommands,
  guildApplicationCommands,
} from './commands/applicationCommands';
import { APP_ID, TOKEN } from './shared_assets';

const globalCommands = Object.values(globalApplicationCommands).map(
  (command) => command.definition,
);
const guildCommands = Object.values(guildApplicationCommands).map(
  (command) => command.definition,
);
const testCommands: Array<RESTPostAPIApplicationCommandsJSONBody> = [
  // admin.definition,
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

const teabotsGuildId = '380669498014957569';

export async function syncGlobalCommands() {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(Routes.applicationCommands(APP_ID), {
      body: globalCommands,
    });
    // for quick updates during testing:
    await rest.put(Routes.applicationGuildCommands(APP_ID, teabotsGuildId), {
      body: testCommands,
    });
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

// unused for now
export async function syncGuildCommands(guildId: string) {
  const response = (await rest.put(
    Routes.applicationGuildCommands(APP_ID, guildId),
    {
      body: guildCommands,
    },
    // this type is for some reason not in the types file
  )) as any as Array<{ id: string; name: string }>; // has more attributes
  return response;
}
