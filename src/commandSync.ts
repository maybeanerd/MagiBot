import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { ping } from './commands/ping';
import { APP_ID, TOKEN } from './shared_assets';

const commands = [ping.slashCommand!.definition];

const rest = new REST({ version: '9' }).setToken(TOKEN);

export async function syncCommands() {
	try {
		console.log('Started refreshing application (/) commands.');
		await rest.put(Routes.applicationCommands(APP_ID), { body: commands });
		console.log('Successfully reloaded application (/) commands.');
	} catch (error) {
		console.error(error);
	}
}
